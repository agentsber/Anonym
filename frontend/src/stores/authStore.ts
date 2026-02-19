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
  register: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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

  register: async (username: string, email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log('Starting registration for:', username, email);
      
      // Generate crypto keys
      const cryptoKeys = generateIdentityKeys();
      const exchangeKeyPair = generateKeyPair();
      
      console.log('Keys generated, calling API...');
      
      // Register with server
      const user = await authApi.register({
        username,
        email,
        password,
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

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log('Starting login for:', email);
      
      // Login with server
      const serverUser = await authApi.login(email, password);
      console.log('Server login successful:', serverUser.id);
      
      // Check if we have local keys for this user
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const keysJson = await secureStorage.getItem(STORAGE_KEYS.CRYPTO_KEYS);
      
      console.log('Local data - userJson:', !!userJson, 'keysJson:', !!keysJson);
      
      if (userJson && keysJson) {
        const localUser = JSON.parse(userJson);
        console.log('Local user:', localUser.username);
        
        if (localUser.id === serverUser.id) {
          // Local keys exist for this user
          const cryptoKeys = JSON.parse(keysJson);
          set({ user: { ...serverUser, exchangeSecretKey: localUser.exchangeSecretKey }, cryptoKeys });
          console.log('Login successful with existing keys');
          return;
        }
      }
      
      // No local keys - generate new ones
      console.log('No local keys, generating new ones...');
      const cryptoKeys = generateIdentityKeys();
      const exchangeKeyPair = generateKeyPair();
      
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
      
      const userWithKeys = {
        ...serverUser,
        exchangeSecretKey: exchangeKeyPair.secretKey,
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithKeys));
      await secureStorage.setItem(STORAGE_KEYS.CRYPTO_KEYS, JSON.stringify(fullCryptoKeys));
      
      set({ user: userWithKeys, cryptoKeys: fullCryptoKeys });
      console.log('Login successful with new keys');
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
