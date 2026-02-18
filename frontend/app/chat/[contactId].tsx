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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { usersApi } from '../../src/services/api';
import { ChatBubble } from '../../src/components/ChatBubble';
import { Message, User } from '../../src/types';

export default function ChatScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { getMessages, sendMessage, fetchPendingMessages, setCurrentChat } = useChatStore();
  
  const [contact, setContact] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble message={item} />
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
          title: contact?.username ? `@${contact.username}` : 'Chat',
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
              <Text style={styles.emptyTitle}>End-to-End Encrypted</Text>
              <Text style={styles.emptyText}>
                Messages in this chat are secured with{`\n`}end-to-end encryption.
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
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Message"
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
});
