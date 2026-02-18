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
      Alert.alert('Invalid Username', 'Username must be at least 3 characters');
      return;
    }
    
    if (!isAvailable) {
      Alert.alert('Username Taken', 'Please choose a different username');
      return;
    }
    
    try {
      await register(username);
      router.replace('/(tabs)');
    } catch (err) {
      // Error is handled in store
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
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={48} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>Choose a Username</Text>
          <Text style={styles.description}>
            This will be your unique identifier.{`\n`}Others can find you with this username.
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
            <View style={styles.statusIcon}>
              {getUsernameStatusIcon()}
            </View>
          </View>
          
          {username.length > 0 && username.length < 3 && (
            <Text style={styles.hint}>Minimum 3 characters</Text>
          )}
          
          {error && (
            <Text style={styles.error}>{error}</Text>
          )}
          
          <View style={styles.keyInfo}>
            <Ionicons name="key-outline" size={20} color="#666" />
            <Text style={styles.keyInfoText}>
              Encryption keys will be generated and stored securely on your device.
            </Text>
          </View>
        </View>
        
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
              <Text style={styles.buttonText}>Create Account</Text>
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
