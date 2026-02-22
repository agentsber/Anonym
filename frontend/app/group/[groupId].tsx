import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Alert,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/stores/authStore';
import { groupsApi, forwardApi } from '../../src/services/api';
import { Group, GroupMessage } from '../../src/types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  error: '#FF6B6B',
  warning: '#FDA7DF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

interface ForwardTarget {
  type: 'user' | 'group';
  id: string;
  name: string;
  avatar_letter?: string;
  avatar_color?: string;
  member_count?: number;
}

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
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GroupMessage | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);

  const isAdmin = group?.members?.some(
    m => m.user_id === user?.id && m.role === 'admin'
  );

  useEffect(() => {
    loadGroupData();
    loadPinnedMessages();
    const interval = setInterval(loadMessages, 3000);
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

  const loadPinnedMessages = async () => {
    if (!groupId) return;
    try {
      const pinned = await groupsApi.getPinnedMessages(groupId);
      setPinnedMessages(pinned);
    } catch (err) {
      console.error('Error loading pinned messages:', err);
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
        reply_to_id: replyTo?.id,
      });
      
      setMessages(prev => [...prev, newMessage]);
      setReplyTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0] && user && groupId) {
      setIsSending(true);
      try {
        const newMessage = await groupsApi.sendMessage(groupId, {
          sender_id: user.id,
          content: '[Изображение]',
          message_type: 'image',
          media_url: result.assets[0].uri,
        });
        setMessages(prev => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      } catch (err) {
        console.error('Error sending image:', err);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleLongPress = (message: GroupMessage) => {
    setSelectedMessage(message);
    setShowMessageMenu(true);
  };

  const handleReply = () => {
    if (selectedMessage) {
      setReplyTo(selectedMessage);
      setShowMessageMenu(false);
    }
  };

  const handleEdit = () => {
    if (selectedMessage && selectedMessage.sender_id === user?.id) {
      setEditingMessage(selectedMessage);
      setEditText(selectedMessage.content);
      setShowMessageMenu(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !groupId || !user || !editText.trim()) return;
    
    try {
      await groupsApi.editMessage(groupId, editingMessage.id, editText.trim(), user.id);
      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id ? { ...m, content: editText.trim(), is_edited: true } : m
      ));
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      console.error('Error editing message:', err);
      Alert.alert('Ошибка', 'Не удалось редактировать сообщение');
    }
  };

  const handleDelete = () => {
    if (!selectedMessage || !groupId || !user) return;
    
    Alert.alert(
      'Удалить сообщение',
      'Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.deleteMessage(groupId, selectedMessage.id, user.id);
              setMessages(prev => prev.map(m =>
                m.id === selectedMessage.id ? { ...m, content: 'Сообщение удалено', is_deleted: true } : m
              ));
              setShowMessageMenu(false);
            } catch (err: any) {
              Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось удалить');
            }
          },
        },
      ]
    );
  };

  const handlePin = async () => {
    if (!selectedMessage || !groupId || !user) return;
    
    try {
      if (selectedMessage.is_pinned) {
        await groupsApi.unpinMessage(groupId, selectedMessage.id, user.id);
      } else {
        await groupsApi.pinMessage(groupId, selectedMessage.id, user.id);
      }
      loadMessages();
      loadPinnedMessages();
      setShowMessageMenu(false);
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось закрепить');
    }
  };

  const handleSearch = async () => {
    if (!groupId || !searchQuery.trim()) return;
    
    try {
      const results = await groupsApi.searchMessages(groupId, searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  const renderMessage = ({ item }: { item: GroupMessage }) => {
    const isOwn = item.sender_id === user?.id;
    const replyMessage = item.reply_to_id ? messages.find(m => m.id === item.reply_to_id) : null;
    
    return (
      <Pressable
        onLongPress={() => handleLongPress(item)}
        style={[styles.messageContainer, isOwn && styles.ownMessage]}
      >
        {item.is_pinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={12} color={COLORS.warning} />
          </View>
        )}
        
        {replyMessage && (
          <View style={styles.replyPreview}>
            <Text style={styles.replyName}>{replyMessage.sender_username}</Text>
            <Text style={styles.replyText} numberOfLines={1}>{replyMessage.content}</Text>
          </View>
        )}
        
        {!isOwn && (
          <Text style={styles.senderName}>{item.sender_username}</Text>
        )}
        
        {item.message_type === 'image' && item.media_url && (
          <Image source={{ uri: item.media_url }} style={styles.messageImage} />
        )}
        
        <LinearGradient
          colors={isOwn ? [COLORS.primary, COLORS.primaryLight] : [COLORS.surfaceLight, COLORS.surfaceLight]}
          style={styles.messageBubble}
        >
          <Text style={styles.messageText}>{item.content}</Text>
          <View style={styles.messageFooter}>
            {item.is_edited && (
              <Text style={styles.editedLabel}>ред.</Text>
            )}
            <Text style={styles.messageTime}>
              {new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

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
            >
              <Text style={styles.headerName} numberOfLines={1}>{group?.name}</Text>
              <Text style={styles.headerSubtitle}>
                {group?.members?.length || 0} участников
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowSearch(!showSearch)}
              >
                <Ionicons name="search" size={22} color={COLORS.text} />
              </TouchableOpacity>
              {pinnedMessages.length > 0 && (
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => setShowPinned(true)}
                >
                  <Ionicons name="pin" size={22} color={COLORS.warning} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push(`/group-manage/${groupId}`)}
              >
                <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск сообщений..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results */}
      {showSearch && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultsTitle}>Результаты ({searchResults.length})</Text>
          {searchResults.slice(0, 5).map(msg => (
            <TouchableOpacity 
              key={msg.id} 
              style={styles.searchResultItem}
              onPress={() => {
                setShowSearch(false);
                setSearchResults([]);
                // Scroll to message
              }}
            >
              <Text style={styles.searchResultSender}>{msg.sender_username}</Text>
              <Text style={styles.searchResultContent} numberOfLines={1}>{msg.content}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Reply Preview */}
        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyContent}>
              <Text style={styles.replyBarName}>{replyTo.sender_username}</Text>
              <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Edit Mode */}
        {editingMessage && (
          <View style={styles.editBar}>
            <View style={styles.editContent}>
              <Text style={styles.editLabel}>Редактирование</Text>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                autoFocus
              />
            </View>
            <TouchableOpacity onPress={() => setEditingMessage(null)}>
              <Ionicons name="close" size={20} color={COLORS.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveEdit} style={{ marginLeft: 12 }}>
              <Ionicons name="checkmark" size={24} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        {!editingMessage && (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
              <Ionicons name="image" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Сообщение..."
              placeholderTextColor={COLORS.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            
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
        )}
      </KeyboardAvoidingView>

      {/* Message Menu Modal */}
      <Modal
        visible={showMessageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMessageMenu(false)}>
          <View style={styles.messageMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleReply}>
              <Ionicons name="arrow-undo" size={20} color={COLORS.text} />
              <Text style={styles.menuText}>Ответить</Text>
            </TouchableOpacity>
            
            {selectedMessage?.sender_id === user?.id && (
              <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                <Ionicons name="pencil" size={20} color={COLORS.text} />
                <Text style={styles.menuText}>Редактировать</Text>
              </TouchableOpacity>
            )}
            
            {isAdmin && (
              <TouchableOpacity style={styles.menuItem} onPress={handlePin}>
                <Ionicons name={selectedMessage?.is_pinned ? "pin-outline" : "pin"} size={20} color={COLORS.warning} />
                <Text style={styles.menuText}>{selectedMessage?.is_pinned ? 'Открепить' : 'Закрепить'}</Text>
              </TouchableOpacity>
            )}
            
            {(selectedMessage?.sender_id === user?.id || isAdmin) && (
              <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                <Ionicons name="trash" size={20} color={COLORS.error} />
                <Text style={[styles.menuText, { color: COLORS.error }]}>Удалить</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Pinned Messages Modal */}
      <Modal
        visible={showPinned}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinned(false)}
      >
        <View style={styles.pinnedModal}>
          <View style={styles.pinnedHeader}>
            <Text style={styles.pinnedTitle}>Закрепленные сообщения</Text>
            <TouchableOpacity onPress={() => setShowPinned(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={pinnedMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.pinnedItem}>
                <Text style={styles.pinnedSender}>{item.sender_username}</Text>
                <Text style={styles.pinnedContent}>{item.content}</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  headerTitle: { alignItems: 'center' },
  headerName: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerButton: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, gap: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  searchResults: { backgroundColor: COLORS.surface, padding: 12 },
  searchResultsTitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  searchResultItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchResultSender: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  searchResultContent: { fontSize: 14, color: COLORS.text },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageContainer: { maxWidth: '80%', marginBottom: 12, alignSelf: 'flex-start' },
  ownMessage: { alignSelf: 'flex-end' },
  pinnedBadge: { position: 'absolute', top: -8, right: -8, zIndex: 1 },
  senderName: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  replyPreview: { backgroundColor: COLORS.surface, padding: 8, borderRadius: 8, marginBottom: 4, borderLeftWidth: 2, borderLeftColor: COLORS.primary },
  replyName: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  replyText: { fontSize: 12, color: COLORS.textSecondary },
  messageBubble: { padding: 12, borderRadius: 16 },
  messageText: { fontSize: 15, color: COLORS.text },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  editedLabel: { fontSize: 10, color: COLORS.textSecondary, fontStyle: 'italic' },
  messageTime: { fontSize: 10, color: COLORS.textSecondary },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  replyContent: { flex: 1 },
  replyBarName: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  replyBarText: { fontSize: 13, color: COLORS.textSecondary },
  editBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  editContent: { flex: 1 },
  editLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  editInput: { fontSize: 15, color: COLORS.text, marginTop: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: COLORS.surface, gap: 8 },
  attachButton: { padding: 8 },
  input: { flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 15, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  messageMenu: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 8, minWidth: 200 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, color: COLORS.text },
  pinnedModal: { flex: 1, backgroundColor: COLORS.background, marginTop: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pinnedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pinnedTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  pinnedItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pinnedSender: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  pinnedContent: { fontSize: 15, color: COLORS.text, marginTop: 4 },
});
