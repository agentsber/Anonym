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

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setUsername(cleaned);
    clearError();
  };

  const handleLogin = async () => {
    if (username.length < 3) {
      Alert.alert('Ошибка', 'Имя пользователя должно быть не менее 3 символов');
      return;
    }
    
    try {
      await login(username);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.log('Login error:', err);
      if (err.message?.includes('No encryption keys') || err.message?.includes('не найдены')) {
        Alert.alert(
          'Ключи не найдены',
          'На этом устройстве нет ключей шифрования для данного аккаунта. Зарегистрируйтесь заново.',
          [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Регистрация', onPress: () => router.push('/auth/register') },
          ]
        );
      } else {
        Alert.alert('Ошибка входа', err.response?.data?.detail || 'Пользователь не найден');
      }
    }
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
              <Ionicons name="log-in" size={48} color="#007AFF" />
            </View>
            
            <Text style={styles.title}>Добро пожаловать</Text>
            <Text style={styles.description}>
              Введите ваше имя пользователя.{`\n`}Ключи шифрования должны быть на этом устройстве.
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
            </View>
            
            {error && (
              <Text style={styles.error}>{error}</Text>
            )}
            
            <View style={styles.warning}>
              <Ionicons name="warning-outline" size={20} color="#FF9500" />
              <Text style={styles.warningText}>
                Ключи шифрования хранятся локально. Если вы регистрировались на другом устройстве, вам нужно зарегистрироваться заново.
              </Text>
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              (username.length < 3 || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={username.length < 3 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Войти</Text>
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
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 18,
    paddingVertical: 16,
    color: '#000',
  },
  error: {
    marginTop: 12,
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF8E6',
    borderRadius: 12,
  },
  warningText: {
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
