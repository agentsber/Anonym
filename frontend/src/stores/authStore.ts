import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User, CryptoKeys } from '../types';
import { generateIdentityKeys, generateKeyPair } from '../services/crypto';
import { authApi } from '../services/api';

const STORAGE_KEYS = {
  USER: 'secure_messenger_user',
  CRYPTO_KEYS: 'secure_messenger_crypto_keys',
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
      const keysJson = await SecureStore.getItemAsync(STORAGE_KEYS.CRYPTO_KEYS);
      
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
      
      // Generate crypto keys
      const cryptoKeys = generateIdentityKeys();
      const exchangeKeyPair = generateKeyPair();
      
      // Register with server
      const user = await authApi.register({
        username,
        public_key: exchangeKeyPair.publicKey,
        identity_key: cryptoKeys.identityKeyPair.publicKey,
        signed_prekey: cryptoKeys.signedPreKeyPair.publicKey,
        prekey_signature: cryptoKeys.preKeySignature,
      });
      
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
      await SecureStore.setItemAsync(STORAGE_KEYS.CRYPTO_KEYS, JSON.stringify(fullCryptoKeys));
      
      set({ user: userWithKeys, cryptoKeys: fullCryptoKeys });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (username: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Check if we have local keys for this user
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const keysJson = await SecureStore.getItemAsync(STORAGE_KEYS.CRYPTO_KEYS);
      
      if (userJson && keysJson) {
        const localUser = JSON.parse(userJson);
        if (localUser.username.toLowerCase() === username.toLowerCase()) {
          // Local keys exist, verify with server
          const serverUser = await authApi.login(username);
          const cryptoKeys = JSON.parse(keysJson);
          set({ user: { ...serverUser, exchangeSecretKey: localUser.exchangeSecretKey }, cryptoKeys });
          return;
        }
      }
      
      // No local keys - user needs to register on this device
      throw new Error('No encryption keys found. Please register on this device.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.CRYPTO_KEYS);
      set({ user: null, cryptoKeys: null });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
