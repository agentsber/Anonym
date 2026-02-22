import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSecurityStore } from '../../src/stores/securityStore';

const PIN_LENGTH = 4;

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

type Step = 'enter' | 'confirm';

export default function SetupPinScreen() {
  const router = useRouter();
  const { setPin, isBiometricAvailable, enableBiometric } = useSecurityStore();
  
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');

  const handleNumberPress = async (num: string) => {
    if (currentPin.length >= PIN_LENGTH) return;
    
    const newPin = currentPin + num;
    setCurrentPin(newPin);
    setError('');
    
    if (newPin.length === PIN_LENGTH) {
      if (step === 'enter') {
        setFirstPin(newPin);
        setCurrentPin('');
        setStep('confirm');
      } else {
        if (newPin === firstPin) {
          try {
            await setPin(newPin);
            
            if (isBiometricAvailable) {
              Alert.alert(
                'Биометрия',
                'Хотите использовать отпечаток пальца или Face ID для быстрого входа?',
                [
                  {
                    text: 'Нет',
                    style: 'cancel',
                    onPress: () => router.back(),
                  },
                  {
                    text: 'Да',
                    onPress: async () => {
                      await enableBiometric(true);
                      router.back();
                    },
                  },
                ]
              );
            } else {
              Alert.alert('Готово', 'PIN-код установлен', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }
          } catch (err) {
            setError('Ошибка сохранения PIN-кода');
            setCurrentPin('');
          }
        } else {
          if (Platform.OS !== 'web') {
            Vibration.vibrate(200);
          }
          setError('PIN-коды не совпадают');
          setCurrentPin('');
          setFirstPin('');
          setStep('enter');
        }
      }
    }
  };

  const handleDelete = () => {
    if (currentPin.length > 0) {
      setCurrentPin(currentPin.slice(0, -1));
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
            i < currentPin.length && styles.dotFilled,
            error && i < currentPin.length && styles.dotError,
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
      ['', '0', 'del'],
    ];

    return numbers.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map((num, index) => {
          if (num === '') {
            return <View key={`empty-${index}`} style={styles.keyButtonEmpty} />;
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
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.iconContainer}
            >
              <Ionicons 
                name={step === 'enter' ? 'key-outline' : 'checkmark-circle-outline'} 
                size={40} 
                color="#FFF" 
              />
            </LinearGradient>
            <Text style={styles.title}>
              {step === 'enter' ? 'Создайте PIN-код' : 'Подтвердите PIN-код'}
            </Text>
            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <Text style={styles.subtitle}>
                {step === 'enter' 
                  ? 'Введите 4-значный PIN-код' 
                  : 'Введите PIN-код ещё раз'}
              </Text>
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
  keyButtonEmpty: {
    width: 75,
    height: 75,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    color: COLORS.text,
  },
});
