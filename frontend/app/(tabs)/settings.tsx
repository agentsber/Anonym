import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useSecurityStore } from '../../src/stores/securityStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { 
    isPinSet, 
    isBiometricEnabled, 
    isBiometricAvailable,
    enableBiometric,
    removePin 
  } = useSecurityStore();

  const handleLogout = () => {
    Alert.alert(
      'Выйти',
      'Вы уверены? Ключи шифрования останутся на устройстве.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить данные',
      'Это навсегда удалит ключи шифрования с устройства. Вы не сможете расшифровать свои сообщения. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleSetupPin = () => {
    if (isPinSet) {
      Alert.alert(
        'PIN-код',
        'Что вы хотите сделать?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Изменить PIN',
            onPress: () => router.push('/security/setup-pin'),
          },
          {
            text: 'Удалить PIN',
            style: 'destructive',
            onPress: async () => {
              await removePin();
              Alert.alert('Готово', 'PIN-код удалён');
            },
          },
        ]
      );
    } else {
      router.push('/security/setup-pin');
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!isPinSet) {
      Alert.alert('Внимание', 'Сначала установите PIN-код');
      return;
    }
    await enableBiometric(value);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>@{user?.username}</Text>
              <Text style={styles.userId}>ID: {user?.id?.slice(0, 8)}...</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Блокировка</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleSetupPin}>
            <Ionicons name="keypad-outline" size={24} color="#007AFF" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>PIN-код</Text>
              <Text style={styles.menuItemSubtext}>
                {isPinSet ? 'Установлен' : 'Не установлен'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          {isBiometricAvailable && (
            <View style={styles.switchItem}>
              <Ionicons name="finger-print" size={24} color="#007AFF" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Биометрия</Text>
                <Text style={styles.menuItemSubtext}>
                  Отпечаток пальца / Face ID
                </Text>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#E0E0E0', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Безопасность</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={24} color="#34C759" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Сквозное шифрование</Text>
                <Text style={styles.infoText}>Все сообщения зашифрованы вашими ключами</Text>
              </View>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRow}>
              <Ionicons name="key" size={24} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Локальные ключи</Text>
                <Text style={styles.infoText}>Ключи хранятся только на устройстве</Text>
              </View>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRow}>
              <Ionicons name="server-outline" size={24} color="#FF9500" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Сервер без доступа</Text>
                <Text style={styles.infoText}>Сервер не может прочитать сообщения</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Аккаунт</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#007AFF" />
            <Text style={[styles.menuItemText, { marginLeft: 12, flex: 1 }]}>Выйти</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.menuItemText, styles.dangerText, { marginLeft: 12, flex: 1 }]}>
              Удалить ключи и данные
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SecureChat v1.0</Text>
          <Text style={styles.footerSubtext}>Защищённый мессенджер</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 16,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  userId: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  infoText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
    marginLeft: 36,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 1,
    padding: 16,
    borderRadius: 12,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemText: {
    fontSize: 17,
    color: '#000',
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 1,
    padding: 16,
    borderRadius: 12,
  },
  dangerItem: {
    marginTop: 12,
  },
  dangerText: {
    color: '#FF3B30',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
  },
});
