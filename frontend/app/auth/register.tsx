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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { authApi } from '../../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const checkUsername = async (value: string) => {
    if (value.length < 3) {
      setIsAvailable(null);
      return;
    }
    
    setIsChecking(true);
    try {
      const available = await authApi.checkUsername(value);
      setIsAvailable(available);
    } catch (err) {
      console.log('Check username error:', err);
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setUsername(cleaned);
    clearError();
    
    if (cleaned.length >= 3) {
      checkUsername(cleaned);
    } else {
      setIsAvailable(null);
    }
  };

  const handleRegister = async () => {
    if (username.length < 3) {
      Alert.alert('Ошибка', 'Имя пользователя должно быть не менее 3 символов');
      return;
    }
    
    if (!isAvailable) {
      Alert.alert('Ошибка', 'Это имя пользователя уже занято');
      return;
    }
    
    try {
      await register(username);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.log('Registration error:', err);
      Alert.alert('Ошибка регистрации', err.response?.data?.detail || 'Попробуйте позже');
    }
  };

  const getUsernameStatusIcon = () => {
    if (isChecking) {
      return <ActivityIndicator size="small" color="#007AFF" />;
    }
    if (isAvailable === true) {
      return <Ionicons name="checkmark-circle" size={24} color="#34C759" />;
    }
    if (isAvailable === false) {
      return <Ionicons name="close-circle" size={24} color="#FF3B30" />;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={48} color="#007AFF" />
            </View>
            
            <Text style={styles.title}>Выберите имя</Text>
            <Text style={styles.description}>
              Это будет ваш уникальный идентификатор.{`\n`}Другие пользователи найдут вас по этому имени.
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="имя пользователя"
                placeholderTextColor="#999"
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
              <View style={styles.statusIcon}>
                {getUsernameStatusIcon()}
              </View>
            </View>
            
            {username.length > 0 && username.length < 3 && (
              <Text style={styles.hint}>Минимум 3 символа</Text>
            )}
            
            {isAvailable === false && (
              <Text style={styles.errorHint}>Имя уже занято</Text>
            )}
            
            {isAvailable === true && (
              <Text style={styles.successHint}>Имя доступно</Text>
            )}
            
            {error && (
              <Text style={styles.error}>{error}</Text>
            )}
            
            <View style={styles.keyInfo}>
              <Ionicons name="key-outline" size={20} color="#666" />
              <Text style={styles.keyInfoText}>
                Ключи шифрования будут сгенерированы и сохранены на вашем устройстве.
              </Text>
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              (!isAvailable || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={!isAvailable || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Создать аккаунт</Text>
            )}
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 16,
    color: '#000',
  },
  statusIcon: {
    marginLeft: 12,
  },
  hint: {
    marginTop: 8,
    color: '#999',
    fontSize: 13,
  },
  errorHint: {
    marginTop: 8,
    color: '#FF3B30',
    fontSize: 13,
  },
  successHint: {
    marginTop: 8,
    color: '#34C759',
    fontSize: 13,
  },
  error: {
    marginTop: 12,
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  keyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
  },
  keyInfoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B0D4FF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
