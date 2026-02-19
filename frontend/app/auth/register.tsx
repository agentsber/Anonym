import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { authApi } from '../../src/services/api';
import debounce from 'lodash/debounce';

export default function RegisterScreen() {
  const [step, setStep] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  
  const { register, login, isLoading, error, clearError } = useAuthStore();

  // Debounced username check
  const checkUsernameAvailability = useCallback(
    debounce(async (name: string) => {
      if (name.length < 3) {
        setIsUsernameAvailable(null);
        return;
      }
      setIsChecking(true);
      try {
        const available = await authApi.checkUsername(name);
        setIsUsernameAvailable(available);
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setIsChecking(false);
      }
    }, 500),
    []
  );

  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    setUsername(cleaned);
    setIsUsernameAvailable(null);
    if (cleaned.length >= 3) {
      checkUsernameAvailability(cleaned);
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async () => {
    clearError();
    
    if (!username || !email || !password || !confirmPassword) {
      return;
    }
    
    if (!validateEmail(email)) {
      return;
    }
    
    if (password !== confirmPassword) {
      return;
    }
    
    if (password.length < 6) {
      return;
    }
    
    try {
      await register(username, email, password);
      router.replace('/(app)');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleLogin = async () => {
    clearError();
    
    if (!email || !password) {
      return;
    }
    
    try {
      await login(email, password);
      router.replace('/(app)');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const getUsernameStatusIcon = () => {
    if (isChecking) {
      return <ActivityIndicator size="small" color="#007AFF" />;
    }
    if (isUsernameAvailable === true) {
      return <Ionicons name="checkmark-circle" size={24} color="#34C759" />;
    }
    if (isUsernameAvailable === false) {
      return <Ionicons name="close-circle" size={24} color="#FF3B30" />;
    }
    return null;
  };

  const canRegister = 
    username.length >= 3 && 
    isUsernameAvailable === true && 
    validateEmail(email) &&
    password.length >= 6 && 
    password === confirmPassword &&
    !isLoading;

  const canLogin = validateEmail(email) && password.length >= 6 && !isLoading;

  if (step === 'login') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons name="log-in" size={48} color="#007AFF" />
              </View>
              
              <Text style={styles.title}>Вход</Text>
              <Text style={styles.description}>
                Войдите с помощью email и пароля
              </Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Пароль"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              
              {error && (
                <Text style={styles.error}>{error}</Text>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !canLogin && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={!canLogin}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Войти</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => { setStep('register'); clearError(); }}>
              <Text style={styles.switchText}>Нет аккаунта? Зарегистрируйтесь</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={48} color="#007AFF" />
            </View>
            
            <Text style={styles.title}>Регистрация</Text>
            <Text style={styles.description}>
              Создайте аккаунт для безопасного общения
            </Text>
            
            {/* Username */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Имя пользователя"
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
            {isUsernameAvailable === false && (
              <Text style={styles.errorHint}>Имя уже занято</Text>
            )}
            
            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              {email.length > 0 && (
                <Ionicons 
                  name={validateEmail(email) ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color={validateEmail(email) ? "#34C759" : "#FF3B30"} 
                />
              )}
            </View>
            
            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Пароль (мин. 6 символов)"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            
            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Подтвердите пароль"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
              {confirmPassword.length > 0 && (
                <Ionicons 
                  name={password === confirmPassword ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color={password === confirmPassword ? "#34C759" : "#FF3B30"} 
                />
              )}
            </View>
            
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorHint}>Пароли не совпадают</Text>
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
            style={[styles.button, !canRegister && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!canRegister}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Создать аккаунт</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => { setStep('login'); clearError(); }}>
            <Text style={styles.switchText}>Уже есть аккаунт? Войти</Text>
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
    paddingTop: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 17,
    color: '#1C1C1E',
  },
  statusIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  errorHint: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  keyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  keyInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
});
