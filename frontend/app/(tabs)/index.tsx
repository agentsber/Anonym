import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SectionList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { groupsApi } from '../../src/services/api';
import { ContactItem } from '../../src/components/ContactItem';
import { User, Group } from '../../src/types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { contacts, chats, loadContacts, fetchPendingMessages, loadLocalMessages } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (user) {
      loadContacts(user.id);
      loadLocalMessages(user.id);
      loadGroups();
    }
  }, [user]);

  // Обновление списка групп при каждом фокусе на экране
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadGroups();
        loadContacts(user.id);
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

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => handleGroupPress(item)}
      activeOpacity={0.7}
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
    </TouchableOpacity>
  );

  const renderContact = ({ item }: { item: User }) => (
    <ContactItem
      contact={item}
      lastMessage={getLastMessage(item.id)}
      onPress={() => handleContactPress(item)}
    />
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
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
    </View>
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
            data={[...groups.map(g => ({ ...g, _type: 'group' })), ...contacts.map(c => ({ ...c, _type: 'contact' }))]}
            renderItem={({ item }: { item: any }) => 
              item._type === 'group' 
                ? renderGroupItem({ item }) 
                : renderContact({ item })
            }
            keyExtractor={(item: any) => item._type + '_' + item.id}
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
});
