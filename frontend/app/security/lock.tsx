import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSecurityStore } from '../../src/stores/securityStore';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  error: '#FF6B6B',
};

export default function LockScreen() {
  const router = useRouter();
  const {
    verifyPin,
    unlock,
    isBiometricEnabled,
    isBiometricAvailable,
    authenticateWithBiometric,
    failedAttempts,
    isWipeEnabled,
    isDataWiped,
  } = useSecurityStore();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // If data was wiped, redirect to welcome screen
    if (isDataWiped) {
      router.replace('/');
    }
  }, [isDataWiped]);

  useEffect(() => {
    // Try biometric on mount
    if (isBiometricEnabled && isBiometricAvailable) {
      handleBiometric();
    }
  }, []);

  const handleBiometric = async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      unlock();
      router.replace('/(tabs)');
    }
  };

  const handleNumberPress = async (num: string) => {
    if (pin.length >= PIN_LENGTH || isVerifying) return;
    
    const newPin = pin + num;
    setPin(newPin);
    setError('');
    
    if (newPin.length === PIN_LENGTH) {
      setIsVerifying(true);
      const isValid = await verifyPin(newPin);
      
      if (isValid) {
        unlock();
        router.replace('/(tabs)');
      } else {
        if (Platform.OS !== 'web') {
          Vibration.vibrate(200);
        }
        
        const remainingAttempts = MAX_ATTEMPTS - failedAttempts - 1;
        
        if (remainingAttempts <= 0 && isWipeEnabled) {
          setError('Данные удалены. Перезапустите приложение.');
        } else if (remainingAttempts <= 2 && isWipeEnabled) {
          setError(`⚠️ Внимание! Осталось ${remainingAttempts} попыток. Данные будут удалены!`);
        } else {
          setError(`Неверный PIN. Осталось попыток: ${remainingAttempts}`);
        }
        setPin('');
      }
      setIsVerifying(false);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < PIN_LENGTH; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            i < pin.length && styles.dotFilled,
            error && styles.dotError,
          ]}
        />
      );
    }
    return dots;
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['bio', '0', 'del'],
    ];

    return numbers.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map((num) => {
          if (num === 'bio') {
            if (isBiometricEnabled && isBiometricAvailable) {
              return (
                <TouchableOpacity
                  key={num}
                  style={styles.keyButton}
                  onPress={handleBiometric}
                >
                  <Ionicons name="finger-print" size={28} color={COLORS.primary} />
                </TouchableOpacity>
              );
            }
            return <View key={num} style={styles.keyButton} />;
          }
          
          if (num === 'del') {
            return (
              <TouchableOpacity
                key={num}
                style={styles.keyButton}
                onPress={handleDelete}
              >
                <Ionicons name="backspace-outline" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity
              key={num}
              style={styles.keyButton}
              onPress={() => handleNumberPress(num)}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.iconContainer}
            >
              <Ionicons name="lock-closed" size={40} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>Введите PIN-код</Text>
            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <Text style={styles.subtitle}>Для доступа к Anonym X</Text>
            )}
          </View>
          
          <View style={styles.dotsContainer}>
            {renderDots()}
          </View>
          
          <View style={styles.numPad}>
            {renderNumberPad()}
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  error: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
  },
  dotError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error,
  },
  numPad: {
    paddingHorizontal: 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  keyButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    color: COLORS.text,
  },
});
