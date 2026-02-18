import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usersApi } from '../src/services/api';
import { useChatStore } from '../src/stores/chatStore';
import { useAuthStore } from '../src/stores/authStore';
import { User } from '../src/types';

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addContact } = useChatStore();
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (username.length < 3) return;
    
    setIsSearching(true);
    setSearchResult(null);
    setNotFound(false);
    
    try {
      const result = await usersApi.search(username);
      if (result) {
        setSearchResult(result);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.log('Search error:', err);
      Alert.alert('Ошибка', 'Не удалось найти пользователя');
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = async () => {
    if (!searchResult || !user) return;
    
    try {
      await addContact(user.id, searchResult);
      router.replace(`/chat/${searchResult.id}`);
    } catch (err) {
      console.log('Add contact error:', err);
      Alert.alert('Ошибка', 'Не удалось добавить контакт');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            Введите точное имя пользователя для поиска.
          </Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder="Имя пользователя"
              placeholderTextColor="#999"
              value={username}
              onChangeText={(text) => {
                setUsername(text.toLowerCase().replace(/[^a-z0-9]/g, ''));
                setSearchResult(null);
                setNotFound(false);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={[
                styles.searchButton,
                (username.length < 3 || isSearching) && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={username.length < 3 || isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          
          {notFound && (
            <View style={styles.notFoundCard}>
              <Ionicons name="person-outline" size={40} color="#8E8E93" />
              <Text style={styles.notFoundText}>Пользователь не найден</Text>
              <Text style={styles.notFoundSubtext}>
                Проверьте правильность имени
              </Text>
            </View>
          )}
          
          {searchResult && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultUsername}>@{searchResult.username}</Text>
                  <View style={styles.encryptedBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#34C759" />
                    <Text style={styles.encryptedText}>E2E шифрование</Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={handleStartChat}
              >
                <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                <Text style={styles.startChatText}>Начать чат</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#000',
  },
  searchButton: {
    marginLeft: 12,
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#B0D4FF',
  },
  notFoundCard: {
    alignItems: 'center',
    marginTop: 48,
    padding: 32,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  notFoundSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  resultCard: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    marginLeft: 16,
    flex: 1,
  },
  resultUsername: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  encryptedText: {
    fontSize: 13,
    color: '#34C759',
    marginLeft: 4,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  startChatText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
});
