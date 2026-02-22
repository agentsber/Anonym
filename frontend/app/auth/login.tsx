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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#555555',
  border: '#333333',
  warning: '#FF9500',
  error: '#FF6B6B',
};

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

  const canLogin = username.length >= 3 && !isLoading;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.logoGradient}
                >
                  <Ionicons name="log-in" size={40} color="#FFF" />
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>Добро пожаловать</Text>
              <Text style={styles.description}>
                Введите ваше имя пользователя.{'\n'}Ключи шифрования должны быть на этом устройстве.
              </Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="at" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Имя пользователя"
                  placeholderTextColor={COLORS.textMuted}
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                />
              </View>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.error}>{error}</Text>
                </View>
              )}
              
              <View style={styles.warning}>
                <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Ключи шифрования хранятся локально. Если вы регистрировались на другом устройстве, вам нужно зарегистрироваться заново.
                </Text>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !canLogin && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={!canLogin}
            >
              <LinearGradient
                colors={canLogin ? [COLORS.primary, COLORS.primaryLight] : [COLORS.surfaceLight, COLORS.surfaceLight]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Войти</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 8,
  },
  error: {
    fontSize: 14,
    color: COLORS.error,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: 16,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
