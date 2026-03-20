import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/stores/authStore';
import api from '../src/services/api';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  success: '#00D9A5',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
};

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  app_version?: string;
  ip_address: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
}

export default function DevicesScreen() {
  const { user } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    if (!user) return;
    
    try {
      const response = await api.get(`/auth/devices/${user.id}`);
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTerminate = (device: Device) => {
    Alert.alert(
      'Завершить сеанс',
      `Завершить сеанс на устройстве "${device.device_name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/auth/devices/${device.id}`, {
                params: { user_id: user?.id }
              });
              setDevices(devices.filter(d => d.id !== device.id));
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось завершить сеанс');
            }
          }
        }
      ]
    );
  };

  const handleTerminateAll = () => {
    Alert.alert(
      'Завершить все сеансы',
      'Завершить все сеансы кроме текущего?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить все',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/auth/devices/all/${user?.id}`, {
                params: { except_current: true }
              });
              setDevices(devices.filter(d => d.is_current));
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось завершить сеансы');
            }
          }
        }
      ]
    );
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'android':
        return 'logo-android';
      case 'ios':
        return 'logo-apple';
      case 'web':
        return 'globe-outline';
      default:
        return 'phone-portrait-outline';
    }
  };

  const getDeviceColor = (type: string): [string, string] => {
    switch (type) {
      case 'android':
        return ['#3DDC84', '#00C853'];
      case 'ios':
        return ['#007AFF', '#5856D6'];
      case 'web':
        return ['#FF9500', '#FF6B00'];
      default:
        return [COLORS.primary, COLORS.primaryLight];
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Неизвестно';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <View style={styles.deviceCard}>
      <LinearGradient
        colors={getDeviceColor(item.device_type)}
        style={styles.deviceIcon}
      >
        <Ionicons name={getDeviceIcon(item.device_type) as any} size={24} color="#FFFFFF" />
      </LinearGradient>
      
      <View style={styles.deviceInfo}>
        <View style={styles.deviceHeader}>
          <Text style={styles.deviceName}>{item.device_name}</Text>
          {item.is_current && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentText}>Текущий</Text>
            </View>
          )}
        </View>
        
        <View style={styles.deviceDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{item.ip_address}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{formatDate(item.last_active)}</Text>
          </View>
          {item.app_version && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>v{item.app_version}</Text>
            </View>
          )}
        </View>
      </View>
      
      {!item.is_current && (
        <TouchableOpacity 
          style={styles.terminateButton}
          onPress={() => handleTerminate(item)}
        >
          <Ionicons name="close-circle" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Устройства',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
          <Text style={styles.infoText}>
            Здесь показаны все устройства, на которых выполнен вход в ваш аккаунт
          </Text>
        </View>

        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="phone-portrait-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Нет активных сеансов</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDevices();
              }}
              tintColor={COLORS.primary}
            />
          }
        />

        {devices.length > 1 && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.terminateAllButton} onPress={handleTerminateAll}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              <Text style={styles.terminateAllText}>Завершить все другие сеансы</Text>
            </TouchableOpacity>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 165, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  currentBadge: {
    backgroundColor: COLORS.success + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  deviceDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  terminateButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  terminateAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  terminateAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
  },
});
