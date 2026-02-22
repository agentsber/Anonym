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
import { LinearGradient } from 'expo-linear-gradient';
import { usersApi } from '../src/services/api';
import { useChatStore } from '../src/stores/chatStore';
import { useAuthStore } from '../src/stores/authStore';
import { User } from '../src/types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#555555',
  border: '#333333',
};

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

  const canSearch = username.length >= 3 && !isSearching;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <Text style={styles.description}>
              Введите точное имя пользователя для поиска.
            </Text>
            
            <View style={styles.searchContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="at" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Имя пользователя"
                  placeholderTextColor={COLORS.textMuted}
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
              </View>
              <TouchableOpacity
                style={[styles.searchButton, !canSearch && styles.searchButtonDisabled]}
                onPress={handleSearch}
                disabled={!canSearch}
              >
                <LinearGradient
                  colors={canSearch ? [COLORS.primary, COLORS.primaryLight] : [COLORS.surfaceLight, COLORS.surfaceLight]}
                  style={styles.searchButtonGradient}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {notFound && (
              <View style={styles.notFoundCard}>
                <Ionicons name="person-outline" size={40} color={COLORS.textSecondary} />
                <Text style={styles.notFoundText}>Пользователь не найден</Text>
                <Text style={styles.notFoundSubtext}>
                  Проверьте правильность имени
                </Text>
              </View>
            )}
            
            {searchResult && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    style={styles.avatar}
                  >
                    <Ionicons name="person" size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultUsername}>@{searchResult.username}</Text>
                    <View style={styles.encryptedBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
                      <Text style={styles.encryptedText}>E2E шифрование</Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.startChatButton}
                  onPress={handleStartChat}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    style={styles.startChatGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                    <Text style={styles.startChatText}>Начать чат</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  searchButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundCard: {
    alignItems: 'center',
    marginTop: 48,
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  notFoundSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  resultCard: {
    marginTop: 24,
    padding: 20,
    backgroundColor: COLORS.surface,
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
    borderRadius: 18,
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
    color: COLORS.text,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  encryptedText: {
    fontSize: 13,
    color: COLORS.success,
    marginLeft: 4,
  },
  startChatButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  startChatText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
