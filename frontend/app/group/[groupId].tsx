import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useAuthStore } from '../../src/stores/authStore';
import { groupsApi, forwardApi, stickersApi } from '../../src/services/api';
import { Group, GroupMessage } from '../../src/types';

// Import refactored components
import {
  COLORS,
  MessageItem,
  MessageMenu,
  InputToolbar,
  ReplyBar,
  EditBar,
  RecordingBar,
  StickerPanel,
  PinnedMessagesModal,
  ForwardModal,
  SearchBar,
  StickerPack,
  ForwardTarget,
  formatDuration,
} from '../../src/components/group-chat';

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  
  // Core state
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Reply/Edit state
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GroupMessage | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [editText, setEditText] = useState('');
  
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupMessage[]>([]);
  
  // Pinned/Forward state
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [forwardTargets, setForwardTargets] = useState<{ contacts: ForwardTarget[]; groups: ForwardTarget[] }>({ contacts: [], groups: [] });
  const [isForwarding, setIsForwarding] = useState(false);
  
  // Stickers state
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
  const [activePackIndex, setActivePackIndex] = useState(0);
  
  // Voice message state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = group?.members?.some(m => m.user_id === user?.id && m.role === 'admin');

  // Effects
  useEffect(() => {
    loadGroupData();
    loadPinnedMessages();
    loadStickerPacks();
    const interval = setInterval(loadMessages, 3000);
    return () => {
      clearInterval(interval);
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, [groupId]);

  // Data loading functions
  const loadStickerPacks = async () => {
    try {
      const packs = await stickersApi.getPacks();
      setStickerPacks(packs);
    } catch (err) {
      console.error('Error loading stickers:', err);
    }
  };

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

  // Message actions
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
    
    Alert.alert('Удалить сообщение', 'Вы уверены?', [
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
    ]);
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

  const handleForwardOpen = async () => {
    if (!selectedMessage || !user) return;
    setShowMessageMenu(false);
    
    try {
      const targets = await forwardApi.getTargets(user.id);
      setForwardTargets(targets);
      setShowForward(true);
    } catch (err) {
      console.error('Error loading forward targets:', err);
      Alert.alert('Ошибка', 'Не удалось загрузить контакты');
    }
  };

  const handleForward = async (target: ForwardTarget) => {
    if (!selectedMessage || !user) return;
    
    setIsForwarding(true);
    try {
      await forwardApi.forwardMessage({
        sender_id: user.id,
        original_message_id: selectedMessage.id,
        original_message_type: 'group',
        target_type: target.type,
        target_id: target.id,
      });
      
      setShowForward(false);
      setSelectedMessage(null);
      Alert.alert('Готово', `Сообщение переслано в ${target.name}`);
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось переслать');
    } finally {
      setIsForwarding(false);
    }
  };

  // Sticker handling
  const handleSendSticker = async (sticker: string) => {
    if (!user || !groupId || isSending) return;
    
    setIsSending(true);
    setShowStickers(false);
    
    try {
      const newMessage = await groupsApi.sendMessage(groupId, {
        sender_id: user.id,
        content: sticker,
        message_type: 'sticker',
      });
      
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (err) {
      console.error('Error sending sticker:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Voice message handling
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нужно разрешение на запись аудио');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      Alert.alert('Ошибка', 'Не удалось начать запись');
    }
  };

  const stopRecording = async () => {
    if (!recording || !user || !groupId) return;
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsRecording(false);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const duration = recordingDuration;
      
      if (uri) {
        setIsSending(true);
        const newMessage = await groupsApi.sendMessage(groupId, {
          sender_id: user.id,
          content: `🎤 Голосовое сообщение (${formatDuration(duration)})`,
          message_type: 'voice',
          media_url: uri,
        });
        
        setMessages(prev => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
    } finally {
      setRecording(null);
      setRecordingDuration(0);
      setIsSending(false);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    try {
      await recording.stopAndUnloadAsync();
    } catch (err) {
      console.error('Error canceling recording:', err);
    }
    
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const playVoiceMessage = async (mediaUrl: string, messageId: string) => {
    try {
      if (playingVoice === messageId) {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingVoice(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri: mediaUrl });
      soundRef.current = sound;
      setPlayingVoice(messageId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingVoice(null);
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.error('Error playing voice:', err);
      setPlayingVoice(null);
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

  // Loading state
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
              <Text style={styles.headerSubtitle}>{group?.members?.length || 0} участников</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowSearch(!showSearch)}>
                <Ionicons name="search" size={22} color={COLORS.text} />
              </TouchableOpacity>
              {pinnedMessages.length > 0 && (
                <TouchableOpacity style={styles.headerButton} onPress={() => setShowPinned(true)}>
                  <Ionicons name="pin" size={22} color={COLORS.warning} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.headerButton} onPress={() => router.push(`/group-manage/${groupId}`)}>
                <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {showSearch && (
        <SearchBar
          query={searchQuery}
          results={searchResults}
          onChangeQuery={setSearchQuery}
          onSearch={handleSearch}
          onSelectResult={() => {
            setShowSearch(false);
            setSearchResults([]);
          }}
        />
      )}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              currentUserId={user?.id || ''}
              messages={messages}
              playingVoice={playingVoice}
              onLongPress={(msg) => {
                setSelectedMessage(msg);
                setShowMessageMenu(true);
              }}
              onPlayVoice={playVoiceMessage}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {replyTo && <ReplyBar replyTo={replyTo} onCancel={() => setReplyTo(null)} />}

        {editingMessage && (
          <EditBar
            editText={editText}
            onChangeText={setEditText}
            onSave={handleSaveEdit}
            onCancel={() => setEditingMessage(null)}
          />
        )}

        {isRecording && (
          <RecordingBar
            duration={recordingDuration}
            onCancel={cancelRecording}
            onStop={stopRecording}
          />
        )}

        {!editingMessage && !isRecording && (
          <InputToolbar
            inputText={inputText}
            isSending={isSending}
            showStickers={showStickers}
            onChangeText={setInputText}
            onSend={handleSend}
            onPickImage={handlePickImage}
            onToggleStickers={() => setShowStickers(!showStickers)}
            onStartRecording={startRecording}
          />
        )}

        {showStickers && (
          <StickerPanel
            stickerPacks={stickerPacks}
            activePackIndex={activePackIndex}
            onSelectPack={setActivePackIndex}
            onSelectSticker={handleSendSticker}
          />
        )}
      </KeyboardAvoidingView>

      <MessageMenu
        visible={showMessageMenu}
        message={selectedMessage}
        currentUserId={user?.id || ''}
        isAdmin={isAdmin || false}
        onClose={() => setShowMessageMenu(false)}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
        onForward={handleForwardOpen}
      />

      <PinnedMessagesModal
        visible={showPinned}
        messages={pinnedMessages}
        onClose={() => setShowPinned(false)}
      />

      <ForwardModal
        visible={showForward}
        targets={forwardTargets}
        isForwarding={isForwarding}
        onClose={() => setShowForward(false)}
        onForward={handleForward}
      />
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
  messagesList: { padding: 16, paddingBottom: 8 },
});
