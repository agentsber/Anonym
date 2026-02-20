import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';
import { groupsApi } from '../../src/services/api';
import { Group, GroupMessage } from '../../src/types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadGroupData();
    const interval = setInterval(loadMessages, 3000); // Poll for new messages
    return () => clearInterval(interval);
  }, [groupId]);

  const loadGroupData = async () => {
    if (!groupId) return;
    
    try {
      const [groupInfo, groupMessages] = await Promise.all([
        groupsApi.getGroupInfo(groupId),
        groupsApi.getMessages(groupId, 100),
      ]);
      
      setGroup(groupInfo);
      setMessages(groupMessages);
    } catch (err) {
      console.error('Error loading group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!groupId) return;
    try {
      const groupMessages = await groupsApi.getMessages(groupId, 100);
      setMessages(groupMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSend = async () => {
    if (!user || !groupId || !inputText.trim() || isSending) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    try {
      const newMessage = await groupsApi.sendMessage(groupId, {
        sender_id: user.id,
        content: messageText,
        message_type: 'text',
      });
      
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setInputText(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = useCallback(({ item }: { item: GroupMessage }) => {
    const isOutgoing = item.sender_id === user?.id;
    
    return (
      <View style={[styles.messageWrapper, isOutgoing && styles.messageWrapperOutgoing]}>
        {!isOutgoing && (
          <View style={styles.senderAvatar}>
            <Text style={styles.senderAvatarText}>
              {item.sender_username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={[styles.messageBubble, isOutgoing ? styles.messageBubbleOutgoing : styles.messageBubbleIncoming]}>
          {!isOutgoing && (
            <Text style={styles.senderName}>{item.sender_username}</Text>
          )}
          <Text style={[styles.messageText, isOutgoing && styles.messageTextOutgoing]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOutgoing && styles.messageTimeOutgoing]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitle: () => (
            <TouchableOpacity 
              style={styles.headerTitle} 
              onPress={() => router.push(`/group-manage/${groupId}`)}
              data-testid="group-header-title"
            >
              <Text style={styles.headerName} numberOfLines={1}>{group?.name}</Text>
              <Text style={styles.headerSubtitle}>
                {group?.members?.length || 0} участников
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push(`/group-manage/${groupId}`)}
              data-testid="group-settings-btn"
            >
              <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Начните общение</Text>
            <Text style={styles.emptyText}>
              Отправьте первое сообщение в группу
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Сообщение..."
              placeholderTextColor={COLORS.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageWrapperOutgoing: {
    justifyContent: 'flex-end',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  senderAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleIncoming: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  messageBubbleOutgoing: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryLight,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  messageTextOutgoing: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageTimeOutgoing: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
});
