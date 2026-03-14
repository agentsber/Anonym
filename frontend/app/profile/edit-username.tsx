import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { usersApi } from '../../src/services/api';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function EditUsernameScreen() {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const checkUsername = useCallback(async (name: string) => {
    if (name.length < 3) {
      setIsAvailable(null);
      setError('Минимум 3 символа');
      return;
    }
    
    if (name.length > 30) {
      setIsAvailable(false);
      setError('Максимум 30 символов');
      return;
    }
    
    if (!/^[a-z0-9_]+$/.test(name)) {
      setIsAvailable(false);
      setError('Только a-z, 0-9 и _');
      return;
    }
    
    if (name === user?.username) {
      setIsAvailable(null);
      setError('');
      return;
    }

    setIsChecking(true);
    setError('');
    try {
      const result = await usersApi.checkUsername(name);
      setIsAvailable(result.available);
      if (!result.available) {
        setError('Имя уже занято');
      }
    } catch (err) {
      console.error('Check username error:', err);
    } finally {
      setIsChecking(false);
    }
  }, [user?.username]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        checkUsername(username.toLowerCase());
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setIsAvailable(null);
  };

  const handleSave = async () => {
    if (!user || !username || username === user.username) return;
    if (!isAvailable) return;
    
    setIsSaving(true);
    try {
      const updated = await usersApi.updateProfile(user.id, {
        username: username,
      });
      
      // Update local user
      setUser({ ...user, username: updated.username });
      
      Alert.alert('Успешно', 'Имя пользователя изменено');
      router.back();
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось сохранить');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <ActivityIndicator size="small" color={COLORS.primary} />;
    }
    if (isAvailable === true) {
      return <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />;
    }
    if (isAvailable === false) {
      return <Ionicons name="close-circle" size={22} color={COLORS.error} />;
    }
    return null;
  };

  const canSave = isAvailable === true && username !== user?.username && !isSaving;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Имя пользователя',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={!canSave}>
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
                  Готово
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="username"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                autoFocus
              />
              <View style={styles.statusIcon}>
                {getStatusIcon()}
              </View>
            </View>
            
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hintText}>
                Минимум 3 символа. Можно использовать a-z, 0-9 и _.
              </Text>
            )}
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Имя пользователя</Text>
            <Text style={styles.infoText}>
              Вы можете выбрать уникальное имя пользователя. Другие пользователи смогут найти вас по этому имени.
            </Text>
            <Text style={styles.infoText}>
              Длина имени: 3-30 символов.
            </Text>
          </View>

          {username && username !== user?.username && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Ваш новый адрес:</Text>
              <Text style={styles.previewLink}>@{username}</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  saveButton: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  inputSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  atSymbol: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: COLORS.text,
    paddingVertical: 14,
  },
  statusIcon: {
    width: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 12,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  infoSection: {
    paddingHorizontal: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  previewSection: {
    marginTop: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  previewLink: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
