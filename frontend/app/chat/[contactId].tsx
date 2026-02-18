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
import { usersApi } from '../../src/services/api';
import { ChatBubble } from '../../src/components/ChatBubble';
import { Message, User } from '../../src/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChatScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { getMessages, sendMessage, sendMedia, fetchPendingMessages, setCurrentChat } = useChatStore();
  
  const [contact, setContact] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAttachment, setShowAttachment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const messages = contactId ? getMessages(contactId) : [];

  useEffect(() => {
    if (contactId) {
      setCurrentChat(contactId);
      loadContact();
    }
    
    return () => {
      setCurrentChat(null);
    };
  }, [contactId]);

  useEffect(() => {
    // Poll for new messages
    const interval = setInterval(() => {
      if (user && (user as any).exchangeSecretKey) {
        fetchPendingMessages(user.id, (user as any).exchangeSecretKey);
      }
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

  const handleSend = async () => {
    if (!messageText.trim() || !user || !contact || isSending) return;
    
    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);
    
    try {
      await sendMessage(
        user.id,
        contact.id,
        text,
        (user as any).exchangeSecretKey,
        contact.public_key,
        'text'
      );
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessageText(text); // Restore message on failure
    } finally {
      setIsSending(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Разрешение требуется',
          'Для отправки изображений необходим доступ к галерее'
        );
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
      console.error('Image picker error:', err);
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
      console.error('Camera error:', err);
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
      console.error('Failed to send image:', err);
      Alert.alert('Ошибка', 'Не удалось отправить изображение');
    } finally {
      setIsSending(false);
    }
  };

  const handleImagePress = (uri: string) => {
    setSelectedImage(uri);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble message={item} onImagePress={handleImagePress} />
  );

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
          title: contact?.username ? `@${contact.username}` : 'Чат',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="shield-checkmark" size={20} color="#34C759" />
            </TouchableOpacity>
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
              <View style={styles.encryptionBadge}>
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  encryptionBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  messagesList: {
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  attachButton: {
    marginRight: 8,
    marginBottom: 6,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0D4FF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  attachmentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
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
    color: '#666',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
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
