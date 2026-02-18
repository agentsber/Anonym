import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User, CryptoKeys } from '../types';
import { generateIdentityKeys, generateKeyPair } from '../services/crypto';
import { authApi } from '../services/api';

const STORAGE_KEYS = {
  USER: 'secure_messenger_user',
  CRYPTO_KEYS: 'secure_messenger_crypto_keys',
};

// Helper for secure storage that works on web too
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

interface AuthState {
  user: User | null;
  cryptoKeys: CryptoKeys | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  register: (username: string) => Promise<void>;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  cryptoKeys: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });
      
      // Load user data
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const keysJson = await secureStorage.getItem(STORAGE_KEYS.CRYPTO_KEYS);
      
      console.log('Initialize - userJson:', !!userJson, 'keysJson:', !!keysJson);
      
      if (userJson && keysJson) {
        const user = JSON.parse(userJson);
        const cryptoKeys = JSON.parse(keysJson);
        set({ user, cryptoKeys });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  register: async (username: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log('Starting registration for:', username);
      
      // Generate crypto keys
      const cryptoKeys = generateIdentityKeys();
      const exchangeKeyPair = generateKeyPair();
      
      console.log('Keys generated, calling API...');
      
      // Register with server
      const user = await authApi.register({
        username,
        public_key: exchangeKeyPair.publicKey,
        identity_key: cryptoKeys.identityKeyPair.publicKey,
        signed_prekey: cryptoKeys.signedPreKeyPair.publicKey,
        prekey_signature: cryptoKeys.preKeySignature,
      });
      
      console.log('Registration successful:', user.id);
      
      // Store full key pairs locally (with secret keys)
      const fullCryptoKeys: CryptoKeys = {
        identityKeyPair: {
          publicKey: cryptoKeys.identityKeyPair.publicKey,
          secretKey: cryptoKeys.identityKeyPair.secretKey,
        },
        signedPreKeyPair: {
          publicKey: cryptoKeys.signedPreKeyPair.publicKey,
          secretKey: cryptoKeys.signedPreKeyPair.secretKey,
        },
        preKeySignature: cryptoKeys.preKeySignature,
      };
      
      // Add exchange key pair to user
      const userWithKeys = {
        ...user,
        exchangeSecretKey: exchangeKeyPair.secretKey,
      };
      
      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithKeys));
      await secureStorage.setItem(STORAGE_KEYS.CRYPTO_KEYS, JSON.stringify(fullCryptoKeys));
      
      console.log('User saved to storage');
      
      set({ user: userWithKeys, cryptoKeys: fullCryptoKeys });
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка регистрации';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (username: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log('Starting login for:', username);
      
      // Check if we have local keys for this user
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const keysJson = await secureStorage.getItem(STORAGE_KEYS.CRYPTO_KEYS);
      
      console.log('Local data - userJson:', !!userJson, 'keysJson:', !!keysJson);
      
      if (userJson && keysJson) {
        const localUser = JSON.parse(userJson);
        console.log('Local user:', localUser.username);
        
        if (localUser.username.toLowerCase() === username.toLowerCase()) {
          // Local keys exist, verify with server
          console.log('Username matches, verifying with server...');
          const serverUser = await authApi.login(username);
          const cryptoKeys = JSON.parse(keysJson);
          set({ user: { ...serverUser, exchangeSecretKey: localUser.exchangeSecretKey }, cryptoKeys });
          console.log('Login successful');
          return;
        }
      }
      
      // No local keys - check if user exists on server
      console.log('No local keys, checking server...');
      try {
        await authApi.login(username);
        // User exists but no local keys
        throw new Error('Ключи шифрования не найдены на этом устройстве. Зарегистрируйтесь заново.');
      } catch (err: any) {
        if (err.response?.status === 404) {
          throw new Error('Пользователь не найден');
        }
        throw err;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Ошибка входа';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      await secureStorage.removeItem(STORAGE_KEYS.CRYPTO_KEYS);
      set({ user: null, cryptoKeys: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
