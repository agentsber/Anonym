import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { groupsApi, contactsApi } from '../../src/services/api';
import { SwipeableContactItem } from '../../src/components/SwipeableContactItem';
import { User, Group } from '../../src/types';
import { AnimatedListItem, FadeInView, ScaleButton } from '../../src/components/AnimatedComponents';

const COLORS = {
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.08)',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
};

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { contacts, chats, unreadCounts, loadContacts, fetchPendingMessages, loadLocalMessages, getUnreadCount } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) {
      loadContacts(user.id);
      loadLocalMessages(user.id);
      loadGroups();
      
      // Start auto-refresh polling (every 5 seconds)
      pollingInterval.current = setInterval(() => {
        if ((user as any).exchangeSecretKey) {
          fetchPendingMessages(user.id, (user as any).exchangeSecretKey);
        }
      }, 5000);
    }
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [user]);

  // Обновление списка групп при каждом фокусе на экране
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadGroups();
        loadContacts(user.id);
        // Fetch new messages when screen is focused
        if ((user as any).exchangeSecretKey) {
          fetchPendingMessages(user.id, (user as any).exchangeSecretKey);
        }
      }
    }, [user])
  );

  const loadGroups = async () => {
    if (!user) return;
    try {
      const userGroups = await groupsApi.getUserGroups(user.id);
      setGroups(userGroups);
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await loadContacts(user.id);
      await loadGroups();
      if ((user as any).exchangeSecretKey) {
        await fetchPendingMessages(user.id, (user as any).exchangeSecretKey);
      }
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const getLastMessage = (contactId: string) => {
    const messages = chats.get(contactId);
    if (!messages || messages.length === 0) return undefined;
    return messages[messages.length - 1];
  };

  const handleContactPress = (contact: User) => {
    router.push(`/chat/${contact.id}`);
  };

  const handleGroupPress = (group: Group) => {
    router.push(`/group/${group.id}`);
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Вчера';
    }
    return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
  };

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => (
    <AnimatedListItem
      index={index}
      onPress={() => handleGroupPress(item)}
      style={styles.groupItem}
    >
      <LinearGradient
        colors={[item.avatar_color || COLORS.primary, item.avatar_color ? item.avatar_color + '99' : COLORS.primaryLight]}
        style={styles.groupAvatar}
      >
        <Ionicons name="people" size={22} color="#FFF" />
      </LinearGradient>
      
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
          {item.last_message?.timestamp && (
            <Text style={styles.groupTime}>
              {formatTime(item.last_message.timestamp)}
            </Text>
          )}
        </View>
        <View style={styles.groupMessageRow}>
          <Text style={styles.groupLastMessage} numberOfLines={1}>
            {item.last_message?.content 
              ? `${item.last_message.sender_username}: ${item.last_message.content}`
              : `${item.member_count || item.members?.length || 0} участников`
            }
          </Text>
        </View>
      </View>
    </AnimatedListItem>
  );

  const handleDeleteChat = async (contactId: string) => {
    if (!user) return;
    
    try {
      // Remove contact from backend
      await contactsApi.remove(user.id, contactId);
      // Reload contacts
      loadContacts(user.id);
    } catch (err) {
      console.error('Failed to delete chat:', err);
      Alert.alert('Ошибка', 'Не удалось удалить чат');
    }
  };

  const renderContact = ({ item, index }: { item: User; index: number }) => (
    <AnimatedListItem 
      index={index} 
      onPress={() => handleContactPress(item)}
    >
      <SwipeableContactItem
        contact={item}
        lastMessage={getLastMessage(item.id)}
        unreadCount={getUnreadCount(item.id)}
        onPress={() => handleContactPress(item)}
        onDelete={handleDeleteChat}
      />
    </AnimatedListItem>
  );

  const EmptyState = () => (
    <FadeInView style={styles.emptyState} delay={200}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Нет чатов</Text>
      <Text style={styles.emptyText}>
        Найдите пользователей или создайте{'\n'}группу для общения
      </Text>
      <View style={styles.emptyButtons}>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/search')}
        >
          <Ionicons name="person-add" size={18} color={COLORS.primary} />
          <Text style={styles.emptyButtonText}>Найти контакты</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.emptyButton, styles.emptyButtonPrimary]}
          onPress={() => router.push('/create-group')}
        >
          <Ionicons name="people" size={18} color="#FFF" />
          <Text style={[styles.emptyButtonText, { color: '#FFF' }]}>Создать группу</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );

  const hasContent = contacts.length > 0 || groups.length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Чаты</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push('/create-group')}
            >
              <Ionicons name="people-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push('/search')}
            >
              <Ionicons name="person-add-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {!hasContent ? (
          <EmptyState />
        ) : (
          <FlatList
            data={(() => {
              const savedMessages = user ? chats.get(user.id) : undefined;
              const hasSaved = savedMessages && savedMessages.length > 0;
              
              const items: any[] = [];
              
              // Add Saved Messages at the top if it has messages
              if (hasSaved && user) {
                items.push({
                  id: user.id,
                  username: 'Избранное',
                  _type: 'saved',
                  _isSaved: true,
                });
              }
              
              // Add groups and contacts
              groups.forEach(g => items.push({ ...g, _type: 'group' }));
              contacts.filter(c => c.id !== user?.id).forEach(c => items.push({ ...c, _type: 'contact' }));
              
              return items;
            })()}
            renderItem={({ item, index }: { item: any; index: number }) => {
              if (item._isSaved) {
                return (
                  <AnimatedListItem 
                    index={index} 
                    onPress={() => router.push(`/chat/${item.id}`)}
                  >
                    <TouchableOpacity style={styles.savedItem} onPress={() => router.push(`/chat/${item.id}`)}>
                      <View style={styles.savedAvatar}>
                        <Ionicons name="bookmark" size={24} color="#FFD700" />
                      </View>
                      <View style={styles.savedContent}>
                        <Text style={styles.savedTitle}>Избранное</Text>
                        <Text style={styles.savedSubtitle}>Сохранённые сообщения</Text>
                      </View>
                    </TouchableOpacity>
                  </AnimatedListItem>
                );
              }
              return item._type === 'group' 
                ? renderGroupItem({ item, index }) 
                : renderContact({ item, index });
            }}
            keyExtractor={(item: any) => (item._isSaved ? 'saved_' : item._type + '_') + item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
          />
        )}
        
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/search')}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingBottom: 80,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  groupContent: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  groupTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  groupMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLastMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emptyButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
  },
  savedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  savedContent: {
    flex: 1,
  },
  savedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  savedSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
