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
      Alert.alert('Invalid Username', 'Username must be at least 3 characters');
      return;
    }
    
    try {
      await login(username);
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err.message?.includes('No encryption keys')) {
        Alert.alert(
          'Keys Not Found',
          'This device does not have encryption keys for this account. Please register on this device.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: () => router.push('/auth/register') },
          ]
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="log-in" size={48} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.description}>
            Enter your username to sign in.{`\n`}Your encryption keys must be on this device.
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="username"
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
              Your encryption keys are stored locally. If you registered on a different device, you need to register again here.
            </Text>
          </View>
        </View>
        
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
              <Text style={styles.buttonText}>Sign In</Text>
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
