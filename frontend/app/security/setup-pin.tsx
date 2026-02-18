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
import { useSecurityStore } from '../../src/stores/securityStore';

const PIN_LENGTH = 4;

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
            return <View key={`empty-${index}`} style={styles.keyButton} />;
          }
          
          if (num === 'del') {
            return (
              <TouchableOpacity
                key={num}
                style={styles.keyButton}
                onPress={handleDelete}
              >
                <Ionicons name="backspace-outline" size={28} color="#333" />
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={step === 'enter' ? 'key-outline' : 'checkmark-circle-outline'} 
              size={40} 
              color="#007AFF" 
            />
          </View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderRadius: 40,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
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
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#007AFF',
  },
  dotError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
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
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#000',
  },
});
