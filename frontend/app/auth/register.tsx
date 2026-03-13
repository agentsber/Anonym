import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';

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
  textMuted: '#555555',
  border: '#333333',
};

export default function RegisterScreen() {
  const [step, setStep] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, login, isLoading, error, clearError } = useAuthStore();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Generate username from email
  const generateUsername = (email: string) => {
    const localPart = email.split('@')[0];
    return localPart.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
  };

  const handleRegister = async () => {
    clearError();
    if (!email || !password || !confirmPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }
    
    try {
      const username = generateUsername(email);
      await register(username, email, password);
      // Only navigate if registration was successful
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Ошибка регистрации. Проверьте подключение к сети.';
      Alert.alert('Ошибка регистрации', errorMsg);
    }
  };

  const handleLogin = async () => {
    clearError();
    if (!email || !password) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }
    
    try {
      await login(email, password);
      // Only navigate if login was successful
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Ошибка входа. Проверьте подключение к сети.';
      Alert.alert('Ошибка входа', errorMsg);
    }
  };

  const canRegister = 
    validateEmail(email) &&
    password.length >= 6 && 
    password === confirmPassword &&
    !isLoading;

  const canLogin = validateEmail(email) && password.length >= 6 && !isLoading;

  if (step === 'login') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.content}>
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    style={styles.logoGradient}
                  >
                    <Ionicons name="chatbubbles" size={40} color="#FFF" />
                  </LinearGradient>
                </View>
                
                <Text style={styles.title}>С возвращением</Text>
                <Text style={styles.description}>
                  Войдите в свой аккаунт
                </Text>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Пароль"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={COLORS.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                )}
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
              
              <TouchableOpacity onPress={() => { setStep('register'); clearError(); }}>
                <Text style={styles.switchText}>
                  Нет аккаунта? <Text style={styles.switchTextHighlight}>Регистрация</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.logoGradient}
                >
                  <Ionicons name="shield-checkmark" size={40} color="#FFF" />
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>Anonym X</Text>
              <Text style={styles.description}>
                Безопасный мессенджер с{'\n'}E2E шифрованием
              </Text>
              
              {/* Email */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                {email.length > 0 && (
                  <Ionicons 
                    name={validateEmail(email) ? "checkmark-circle" : "close-circle"} 
                    size={22} 
                    color={validateEmail(email) ? COLORS.success : COLORS.error} 
                  />
                )}
              </View>
              
              {/* Password */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Пароль (мин. 6 символов)"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Подтвердите пароль"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
                {confirmPassword.length > 0 && (
                  <Ionicons 
                    name={password === confirmPassword ? "checkmark-circle" : "close-circle"} 
                    size={22} 
                    color={password === confirmPassword ? COLORS.success : COLORS.error} 
                  />
                )}
              </View>
              
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorHint}>Пароли не совпадают</Text>
              )}
              
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.error}>{error}</Text>
                </View>
              )}
              
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="shield" size={18} color={COLORS.primary} />
                  <Text style={styles.featureText}>E2E шифрование</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="eye-off" size={18} color={COLORS.primary} />
                  <Text style={styles.featureText}>Приватность</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="key" size={18} color={COLORS.primary} />
                  <Text style={styles.featureText}>Локальные ключи</Text>
                </View>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !canRegister && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={!canRegister}
            >
              <LinearGradient
                colors={canRegister ? [COLORS.primary, COLORS.primaryLight] : [COLORS.surfaceLight, COLORS.surfaceLight]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Создать аккаунт</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => { setStep('login'); clearError(); }}>
              <Text style={styles.switchText}>
                Уже есть аккаунт? <Text style={styles.switchTextHighlight}>Войти</Text>
              </Text>
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
  statusIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButton: {
    padding: 4,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 16,
  },
  errorHint: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 16,
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
  featureList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 50,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
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
  switchText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  switchTextHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
