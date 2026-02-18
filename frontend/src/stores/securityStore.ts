import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const STORAGE_KEYS = {
  PIN_CODE: 'secure_messenger_pin',
  BIOMETRIC_ENABLED: 'secure_messenger_biometric',
  LOCK_ENABLED: 'secure_messenger_lock_enabled',
  FAILED_ATTEMPTS: 'secure_messenger_failed_attempts',
};

const MAX_FAILED_ATTEMPTS = 5;

interface SecurityState {
  isLocked: boolean;
  isPinSet: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  failedAttempts: number;
  isInitialized: boolean;
  
  initialize: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  removePin: () => Promise<void>;
  enableBiometric: (enabled: boolean) => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
  checkBiometricAvailability: () => Promise<boolean>;
  resetFailedAttempts: () => Promise<void>;
}

// Simple hash function for PIN (in production use proper crypto)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + pin.length.toString();
};

export const useSecurityStore = create<SecurityState>((set, get) => ({
  isLocked: false,
  isPinSet: false,
  isBiometricEnabled: false,
  isBiometricAvailable: false,
  failedAttempts: 0,
  isInitialized: false,

  initialize: async () => {
    try {
      const [pinHash, biometricEnabled, failedAttemptsStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PIN_CODE),
        AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS),
      ]);
      
      const isPinSet = !!pinHash;
      const isBiometricEnabled = biometricEnabled === 'true';
      const failedAttempts = failedAttemptsStr ? parseInt(failedAttemptsStr, 10) : 0;
      
      // Check biometric availability
      let isBiometricAvailable = false;
      if (Platform.OS !== 'web') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        isBiometricAvailable = hasHardware && isEnrolled;
      }
      
      set({
        isPinSet,
        isBiometricEnabled,
        isBiometricAvailable,
        failedAttempts,
        isLocked: isPinSet, // Lock if PIN is set
        isInitialized: true,
      });
    } catch (error) {
      console.error('Security init error:', error);
      set({ isInitialized: true });
    }
  },

  setPin: async (pin: string) => {
    try {
      const hashedPin = hashPin(pin);
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_CODE, hashedPin);
      await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
      set({ isPinSet: true, failedAttempts: 0 });
    } catch (error) {
      console.error('Set PIN error:', error);
      throw error;
    }
  },

  verifyPin: async (pin: string) => {
    try {
      const storedHash = await AsyncStorage.getItem(STORAGE_KEYS.PIN_CODE);
      if (!storedHash) return false;
      
      const inputHash = hashPin(pin);
      const isValid = storedHash === inputHash;
      
      if (isValid) {
        await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
        set({ failedAttempts: 0 });
        return true;
      } else {
        const { failedAttempts } = get();
        const newAttempts = failedAttempts + 1;
        await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, newAttempts.toString());
        set({ failedAttempts: newAttempts });
        
        // Clear data after max attempts
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          // In production, you might want to clear all data here
          console.warn('Max failed attempts reached!');
        }
        
        return false;
      }
    } catch (error) {
      console.error('Verify PIN error:', error);
      return false;
    }
  },

  removePin: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PIN_CODE,
        STORAGE_KEYS.BIOMETRIC_ENABLED,
        STORAGE_KEYS.FAILED_ATTEMPTS,
      ]);
      set({ isPinSet: false, isBiometricEnabled: false, isLocked: false, failedAttempts: 0 });
    } catch (error) {
      console.error('Remove PIN error:', error);
      throw error;
    }
  },

  enableBiometric: async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
      set({ isBiometricEnabled: enabled });
    } catch (error) {
      console.error('Enable biometric error:', error);
      throw error;
    }
  },

  authenticateWithBiometric: async () => {
    try {
      if (Platform.OS === 'web') return false;
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Подтвердите вашу личность',
        cancelLabel: 'Отмена',
        fallbackLabel: 'Использовать PIN',
        disableDeviceFallback: true,
      });
      
      return result.success;
    } catch (error) {
      console.error('Biometric auth error:', error);
      return false;
    }
  },

  checkBiometricAvailability: async () => {
    try {
      if (Platform.OS === 'web') return false;
      
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;
      
      set({ isBiometricAvailable: available });
      return available;
    } catch (error) {
      console.error('Check biometric error:', error);
      return false;
    }
  },

  lock: () => {
    const { isPinSet } = get();
    if (isPinSet) {
      set({ isLocked: true });
    }
  },

  unlock: () => {
    set({ isLocked: false });
  },

  resetFailedAttempts: async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
    set({ failedAttempts: 0 });
  },
}));
