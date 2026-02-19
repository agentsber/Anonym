import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { ContactItem } from '../../src/components/ContactItem';
import { User } from '../../src/types';

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
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (user) {
      loadContacts(user.id);
      loadLocalMessages(user.id);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await loadContacts(user.id);
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
        Найдите пользователей, чтобы начать{'\n'}защищённую переписку
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/search')}
      >
        <Text style={styles.emptyButtonText}>Найти контакты</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Чаты</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="person-add-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : styles.listContainer}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
        
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
  emptyContainer: {
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
  emptyButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyButtonText: {
    color: COLORS.primary,
    fontSize: 15,
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
