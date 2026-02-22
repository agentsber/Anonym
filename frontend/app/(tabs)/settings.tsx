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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/authStore';
import { useSecurityStore } from '../../src/stores/securityStore';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  warning: '#FF9F43',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { 
    isPinSet, 
    isBiometricEnabled, 
    isBiometricAvailable,
    isWipeEnabled,
    enableBiometric,
    enableWipeOnMaxAttempts,
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

  const handleWipeToggle = async (value: boolean) => {
    if (!isPinSet) {
      Alert.alert('Внимание', 'Сначала установите PIN-код');
      return;
    }
    
    if (value) {
      Alert.alert(
        'Автоудаление данных',
        'При 5 неверных попытках ввода PIN-кода ВСЕ данные приложения будут безвозвратно удалены. Включить?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Включить',
            style: 'destructive',
            onPress: async () => {
              await enableWipeOnMaxAttempts(true);
            },
          },
        ]
      );
    } else {
      await enableWipeOnMaxAttempts(false);
    }
  };
  };

  // Generate avatar color based on username
  const getAvatarColors = () => {
    if (!user?.username) return [COLORS.primary, COLORS.primaryLight];
    const colors = [
      [COLORS.primary, COLORS.primaryLight],
      ['#00D9A5', '#00B894'],
      ['#FF6B6B', '#EE5A24'],
      ['#FDA7DF', '#D980FA'],
    ];
    const index = user.username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Настройки</Text>
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.profileCard}>
              <LinearGradient
                colors={getAvatarColors()}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.username}>@{user?.username}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Блокировка</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleSetupPin}>
              <View style={[styles.menuIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="keypad" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>PIN-код</Text>
                <Text style={styles.menuItemSubtext}>
                  {isPinSet ? 'Установлен' : 'Не установлен'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            {isBiometricAvailable && (
              <View style={styles.switchItem}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.success + '20' }]}>
                  <Ionicons name="finger-print" size={20} color={COLORS.success} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>Биометрия</Text>
                  <Text style={styles.menuItemSubtext}>
                    Отпечаток пальца / Face ID
                  </Text>
                </View>
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
            
            {isPinSet && (
              <View style={styles.switchItem}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.error + '20' }]}>
                  <Ionicons name="nuclear" size={20} color={COLORS.error} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>Автоудаление</Text>
                  <Text style={styles.menuItemSubtext}>
                    Удалить данные после 5 неверных попыток
                  </Text>
                </View>
                <Switch
                  value={isWipeEnabled}
                  onValueChange={handleWipeToggle}
                  trackColor={{ false: COLORS.surfaceLight, true: COLORS.error }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Безопасность</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.success + '20' }]}>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Сквозное шифрование</Text>
                  <Text style={styles.infoText}>Сообщения зашифрованы вашими ключами</Text>
                </View>
              </View>
              
              <View style={styles.separator} />
              
              <View style={styles.infoRow}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.primary + '20' }]}>
                  <Ionicons name="key" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Локальные ключи</Text>
                  <Text style={styles.infoText}>Ключи хранятся только на устройстве</Text>
                </View>
              </View>
              
              <View style={styles.separator} />
              
              <View style={styles.infoRow}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.warning + '20' }]}>
                  <Ionicons name="server-outline" size={20} color={COLORS.warning} />
                </View>
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
              <View style={[styles.menuIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.menuItemText, { flex: 1 }]}>Выйти</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleDeleteAccount}>
              <View style={[styles.menuIcon, { backgroundColor: COLORS.error + '20' }]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </View>
              <Text style={[styles.menuItemText, styles.dangerText, { flex: 1 }]}>
                Удалить ключи и данные
              </Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Anonym X v1.0</Text>
            <Text style={styles.footerSubtext}>Защищённый мессенджер</Text>
          </View>
        </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
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
    color: COLORS.text,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    marginLeft: 44,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 2,
    padding: 14,
    borderRadius: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  menuItemSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 2,
    padding: 14,
    borderRadius: 16,
  },
  dangerItem: {
    marginTop: 12,
  },
  dangerText: {
    color: COLORS.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.border,
    marginTop: 4,
  },
});
