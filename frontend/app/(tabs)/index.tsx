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
import { useAuthStore } from '../../src/stores/authStore';
import { useChatStore } from '../../src/stores/chatStore';
import { ContactItem } from '../../src/components/ContactItem';
import { User } from '../../src/types';

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
      <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>Нет чатов</Text>
      <Text style={styles.emptyText}>
        Найдите пользователей, чтобы начать{`\n`}защищённую переписку
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/search')}
      >
        <Ionicons name="search" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
