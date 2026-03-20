import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { usersApi, messagesApi } from '../../src/services/api';
import { AnimatedChatBubble } from '../../src/components/AnimatedChatBubble';
import { Message, User, AUTO_DELETE_OPTIONS } from '../../src/types';
import { encryptMessage } from '../../src/services/crypto';

const COLORS = {
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.08)',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChatScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { getMessages, sendMessage, sendMedia, fetchPendingMessages, setCurrentChat, updateMessage, deleteMessage } = useChatStore();
  
  const [contact, setContact] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAttachment, setShowAttachment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [contactOnline, setContactOnline] = useState(false);
  const [contactLastSeen, setContactLastSeen] = useState<string | null>(null);
  
  // Reply & Edit state
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  // Auto-delete timer
  const [autoDeleteSeconds, setAutoDeleteSeconds] = useState<number | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const flatListRef = useRef<FlatList>(null);

  const messages = contactId ? getMessages(contactId) : [];

  useEffect(() => {
    if (contactId) {
      setCurrentChat(contactId);
      loadContact();
      checkOnlineStatus();
    }
    
    return () => {
      setCurrentChat(null);
    };
  }, [contactId]);

  useEffect(() => {
    // Poll for new messages and online status
    const interval = setInterval(() => {
      if (user && (user as any).exchangeSecretKey) {
        fetchPendingMessages(user.id, (user as any).exchangeSecretKey);
      }
      checkOnlineStatus();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [user]);

  const loadContact = async () => {
    if (!contactId) return;
    
    setIsLoading(true);
    try {
      const contactData = await usersApi.getUser(contactId);
      setContact(contactData);
    } catch (err) {
      console.error('Failed to load contact:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkOnlineStatus = async () => {
    if (!contactId) return;
    try {
      const status = await usersApi.getStatus(contactId);
      setContactOnline(status.online);
      setContactLastSeen(status.last_seen);
    } catch (err) {
      // Ignore errors
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return '';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Ошибка', 'Нужен доступ к микрофону для записи голосовых сообщений');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Ошибка', 'Не удалось начать запись');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri && recordingDuration >= 1) {
        await sendVoiceMessage(uri);
      }
      
      setRecordingDuration(0);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  };

  const sendVoiceMessage = async (uri: string) => {
    if (!user || !contact) return;
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'audio/m4a',
        name: `voice_${Date.now()}.m4a`,
      } as any);
      formData.append('sender_id', user.id);
      formData.append('duration', recordingDuration.toString());
      
      // Upload voice message
      const uploadResponse = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://private-social-18.preview.emergentagent.com'}/api/upload/voice`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload voice');
      }
      
      const { url, duration } = await uploadResponse.json();
      const fullUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://private-social-18.preview.emergentagent.com'}${url}`;
      
      // Send message with voice URL
      const { encrypted, ephemeralPublicKey } = encryptMessage(
        fullUrl,
        contact.public_key,
        (user as any).exchangeSecretKey
      );
      
      await messagesApi.send({
        sender_id: user.id,
        receiver_id: contact.id,
        encrypted_content: encrypted,
        ephemeral_key: ephemeralPublicKey,
        message_type: 'audio',
      });
      
      // Add to local chat
      const localMessage: Message = {
        id: `voice_${Date.now()}`,
        sender_id: user.id,
        receiver_id: contact.id,
        content: '',
        message_type: 'audio',
        status: 'sent',
        timestamp: new Date(),
        isOutgoing: true,
        media_url: fullUrl,
        duration: duration,
      };
      
      // Update local state through store
      const { chats } = useChatStore.getState();
      const chatMessages = chats.get(contact.id) || [];
      const newChats = new Map(chats);
      newChats.set(contact.id, [...chatMessages, localMessage]);
      useChatStore.setState({ chats: newChats });
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Failed to send voice message:', err);
      Alert.alert('Ошибка', 'Не удалось отправить голосовое сообщение');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (!messageText.trim() || !user || !contact || isSending) return;
    
    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);
    
    try {
      if (editingMessage) {
        // Edit existing message
        const { encrypted, ephemeralPublicKey } = encryptMessage(
          text,
          contact.public_key,
          (user as any).exchangeSecretKey
        );
        
        await messagesApi.edit(editingMessage.id, user.id, {
          encrypted_content: encrypted,
          ephemeral_key: ephemeralPublicKey,
        });
        
        // Update local message
        updateMessage(contactId!, editingMessage.id, { content: text, edited: true });
        setEditingMessage(null);
      } else {
        // Send new message
        await sendMessage(
          user.id,
          contact.id,
          text,
          (user as any).exchangeSecretKey,
          contact.public_key,
          'text',
          replyTo?.id,
          autoDeleteSeconds || undefined
        );
        setReplyTo(null);
      }
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessage(null);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setMessageText(message.content);
    setReplyTo(null);
  };

  const handleDelete = async (message: Message, forEveryone: boolean) => {
    try {
      await messagesApi.delete(message.id, user!.id, forEveryone);
      if (forEveryone) {
        updateMessage(contactId!, message.id, { deleted: true });
      } else {
        deleteMessage(contactId!, message.id);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      Alert.alert('Ошибка', 'Не удалось удалить сообщение');
    }
  };

  const cancelReplyOrEdit = () => {
    setReplyTo(null);
    setEditingMessage(null);
    setMessageText('');
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Разрешение требуется', 'Для отправки изображений необходим доступ к галерее');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    setShowAttachment(false);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      
      if (!result.canceled && result.assets[0].base64) {
        await sendImageMessage(result.assets[0].base64, result.assets[0].fileName || 'image.jpg');
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const takePhoto = async () => {
    setShowAttachment(false);
    
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Разрешение требуется', 'Для съёмки необходим доступ к камере');
        return;
      }
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      
      if (!result.canceled && result.assets[0].base64) {
        await sendImageMessage(result.assets[0].base64, 'photo.jpg');
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const sendImageMessage = async (base64: string, fileName: string) => {
    if (!user || !contact) return;
    
    setIsSending(true);
    
    try {
      await sendMedia(
        user.id,
        contact.id,
        base64,
        (user as any).exchangeSecretKey,
        contact.public_key,
        'image',
        fileName
      );
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось отправить изображение');
    } finally {
      setIsSending(false);
    }
  };

  const handleImagePress = (uri: string) => {
    setSelectedImage(uri);
  };

  const getReplyMessage = (replyToId: string | undefined) => {
    if (!replyToId) return undefined;
    return messages.find(m => m.id === replyToId);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <AnimatedChatBubble 
      message={item} 
      onImagePress={handleImagePress}
      onReply={handleReply}
      onEdit={handleEdit}
      onDelete={handleDelete}
      replyMessage={getReplyMessage(item.reply_to_id)}
      index={index}
    />
  );

  const renderHeaderSubtitle = () => {
    if (contactOnline) {
      return <Text style={styles.onlineText}>онлайн</Text>;
    }
    if (contactLastSeen) {
      return <Text style={styles.lastSeenText}>был(а) {formatLastSeen(contactLastSeen)}</Text>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Text style={styles.headerName}>@{contact?.username}</Text>
              {renderHeaderSubtitle()}
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => {
                  if (contact) {
                    router.push({
                      pathname: '/video-call',
                      params: { calleeId: contact.id, calleeName: contact.username, callType: 'audio' }
                    });
                  }
                }}
              >
                <Ionicons name="call" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => {
                  if (contact) {
                    router.push({
                      pathname: '/video-call',
                      params: { calleeId: contact.id, calleeName: contact.username, callType: 'video' }
                    });
                  }
                }}
              >
                <Ionicons name="videocam" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowTimerMenu(true)}
              >
                <Ionicons 
                  name={autoDeleteSeconds ? "timer" : "timer-outline"} 
                  size={20} 
                  color={autoDeleteSeconds ? "#FF9500" : COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.encryptionIcon}>
                  <Ionicons name="lock-closed" size={24} color="#007AFF" />
                </View>
                <Text style={styles.emptyTitle}>Сквозное шифрование</Text>
                <Text style={styles.emptyText}>
                  Сообщения в этом чате защищены{`\n`}сквозным шифрованием.
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />
            )}
          </View>
          
          {/* Reply/Edit Preview */}
          {(replyTo || editingMessage) && (
            <View style={styles.replyPreviewBar}>
              <View style={styles.replyPreviewContent}>
                <Ionicons 
                  name={editingMessage ? "pencil" : "arrow-undo"} 
                  size={18} 
                  color="#007AFF" 
                />
                <View style={styles.replyPreviewText}>
                  <Text style={styles.replyPreviewLabel}>
                    {editingMessage ? 'Редактирование' : 'Ответ'}
                  </Text>
                  <Text style={styles.replyPreviewMessage} numberOfLines={1}>
                    {(editingMessage || replyTo)?.content}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={cancelReplyOrEdit}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Recording UI */}
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <TouchableOpacity style={styles.cancelRecordButton} onPress={cancelRecording}>
                <Ionicons name="close" size={24} color={COLORS.error} />
              </TouchableOpacity>
              <View style={styles.recordingInfo}>
                <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
              </View>
              <TouchableOpacity style={styles.sendRecordButton} onPress={stopRecording}>
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setShowAttachment(true)}
              >
                <Ionicons name="add-circle" size={28} color={COLORS.primary} />
              </TouchableOpacity>
              
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Сообщение"
                  placeholderTextColor={COLORS.textSecondary}
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={4096}
                />
              </View>
              
              {messageText.trim() ? (
                <TouchableOpacity
                  style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.micButton}
                  onPress={startRecording}
                >
                  <Ionicons name="mic" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
        
        {/* Timer Menu */}
        <Modal
          visible={showTimerMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimerMenu(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTimerMenu(false)}
          >
            <View style={styles.timerMenu}>
              <Text style={styles.timerTitle}>Исчезающие сообщения</Text>
              <Text style={styles.timerSubtitle}>Сообщения будут удалены после прочтения</Text>
              
              {AUTO_DELETE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.timerOption,
                    autoDeleteSeconds === option.value && styles.timerOptionSelected
                  ]}
                  onPress={() => {
                    setAutoDeleteSeconds(option.value);
                    setShowTimerMenu(false);
                  }}
                >
                  <Text style={[
                    styles.timerOptionText,
                    autoDeleteSeconds === option.value && styles.timerOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {autoDeleteSeconds === option.value && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* Attachment Modal */}
        <Modal
          visible={showAttachment}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAttachment(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAttachment(false)}
          >
            <View style={styles.attachmentSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Прикрепить</Text>
              
              <View style={styles.attachmentOptions}>
                <TouchableOpacity style={styles.attachOption} onPress={takePhoto}>
                  <View style={[styles.attachIcon, { backgroundColor: '#FF9500' }]}>
                    <Ionicons name="camera" size={28} color="#FFF" />
                  </View>
                  <Text style={styles.attachLabel}>Камера</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.attachOption} onPress={pickImage}>
                  <View style={[styles.attachIcon, { backgroundColor: '#007AFF' }]}>
                    <Ionicons name="image" size={28} color="#FFF" />
                  </View>
                  <Text style={styles.attachLabel}>Галерея</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAttachment(false)}
              >
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* Image Preview Modal */}
        <Modal
          visible={!!selectedImage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imagePreviewContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  onlineText: {
    fontSize: 12,
    color: COLORS.success,
  },
  lastSeenText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  encryptedBadge: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  encryptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  messagesList: {
    paddingVertical: 12,
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  replyPreviewText: {
    flex: 1,
  },
  replyPreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  replyPreviewMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  attachButton: {
    marginRight: 8,
    marginBottom: 6,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
  micButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cancelRecordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 10,
  },
  recordingTime: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sendRecordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  timerMenu: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  timerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  timerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  timerOptionSelected: {
    backgroundColor: COLORS.surfaceLight,
  },
  timerOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  timerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  attachmentSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  attachmentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  attachOption: {
    alignItems: 'center',
  },
  attachIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  attachLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 17,
    color: COLORS.primary,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  previewImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
});
