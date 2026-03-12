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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { usersApi, messagesApi } from '../../src/services/api';
import { ChatBubble } from '../../src/components/ChatBubble';
import { Message, User, AUTO_DELETE_OPTIONS } from '../../src/types';
import { encryptMessage } from '../../src/services/crypto';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
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

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble 
      message={item} 
      onImagePress={handleImagePress}
      onReply={handleReply}
      onEdit={handleEdit}
      onDelete={handleDelete}
      replyMessage={getReplyMessage(item.reply_to_id)}
    />
  );

  const renderHeaderSubtitle = () => {
    if (contactOnline) {
      return <Text style={styles.onlineText}>в сети</Text>;
    }
    if (contactLastSeen) {
      return <Text style={styles.lastSeenText}>был(а) {formatLastSeen(contactLastSeen)}</Text>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
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
                      params: { calleeId: contact.id, calleeName: contact.username, callType: 'video' }
                    });
                  }
                }}
              >
                <Ionicons name="videocam" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowTimerMenu(true)}
              >
                <Ionicons 
                  name={autoDeleteSeconds ? "timer" : "timer-outline"} 
                  size={20} 
                  color={autoDeleteSeconds ? "#FF9500" : "#007AFF"} 
                />
              </TouchableOpacity>
              <View style={styles.encryptedBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#34C759" />
              </View>
            </View>
          ),
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
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
            />
          )}
          
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
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowAttachment(true)}
            >
              <Ionicons name="add-circle" size={28} color="#007AFF" />
            </TouchableOpacity>
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Сообщение"
                placeholderTextColor="#8E8E93"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={4096}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
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
