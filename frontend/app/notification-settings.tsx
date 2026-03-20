import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore, NotificationSound } from '../src/stores/notificationStore';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

const SOUNDS: { key: NotificationSound; name: string; icon: string }[] = [
  { key: 'default', name: 'По умолчанию', icon: 'notifications' },
  { key: 'chime', name: 'Перезвон', icon: 'musical-note' },
  { key: 'bell', name: 'Колокольчик', icon: 'notifications-outline' },
  { key: 'pop', name: 'Поп', icon: 'radio-button-on' },
  { key: 'none', name: 'Без звука', icon: 'volume-mute' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const {
    notificationsEnabled,
    soundEnabled,
    selectedSound,
    vibrationEnabled,
    showPreview,
    mutedChats,
    setNotificationsEnabled,
    setSoundEnabled,
    setSelectedSound,
    setVibrationEnabled,
    setShowPreview,
    unmuteChat,
    getMutedChats,
  } = useNotificationStore();

  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    if (value) {
      Alert.alert('Уведомления включены', 'Вы будете получать уведомления о новых сообщениях');
    }
  };

  const formatMuteTime = (mutedUntil: number | null) => {
    if (!mutedUntil) return 'Навсегда';
    
    const remaining = mutedUntil - Date.now();
    if (remaining <= 0) return 'Истекло';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} дн.`;
    }
    if (hours > 0) {
      return `${hours} ч. ${minutes} мин.`;
    }
    return `${minutes} мин.`;
  };

  const activeMutedChats = getMutedChats();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Уведомления</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={24} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Уведомления</Text>
                <Text style={styles.settingDescription}>
                  Получать уведомления о новых сообщениях
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>
        </View>

        {/* Sound Settings */}
        <View style={[styles.section, !notificationsEnabled && styles.sectionDisabled]}>
          <Text style={styles.sectionTitle}>Звук и вибрация</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high" size={24} color={COLORS.text} />
              <Text style={styles.settingTitle}>Звук</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
              disabled={!notificationsEnabled}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => setShowSoundPicker(true)}
            disabled={!notificationsEnabled || !soundEnabled}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="musical-notes" size={24} color={COLORS.text} />
              <Text style={styles.settingTitle}>Мелодия</Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {SOUNDS.find(s => s.key === selectedSound)?.name}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait" size={24} color={COLORS.text} />
              <Text style={styles.settingTitle}>Вибрация</Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
              disabled={!notificationsEnabled}
            />
          </View>
        </View>

        {/* Preview Settings */}
        <View style={[styles.section, !notificationsEnabled && styles.sectionDisabled]}>
          <Text style={styles.sectionTitle}>Приватность</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="eye" size={24} color={COLORS.text} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Показывать текст</Text>
                <Text style={styles.settingDescription}>
                  Отображать превью сообщения в уведомлении
                </Text>
              </View>
            </View>
            <Switch
              value={showPreview}
              onValueChange={setShowPreview}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
              disabled={!notificationsEnabled}
            />
          </View>
        </View>

        {/* Muted Chats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Отключённые чаты</Text>
          
          {activeMutedChats.length === 0 ? (
            <View style={styles.emptyMuted}>
              <Ionicons name="notifications-off-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyMutedText}>Нет отключённых чатов</Text>
              <Text style={styles.emptyMutedSubtext}>
                Отключить уведомления для чата можно в меню чата
              </Text>
            </View>
          ) : (
            activeMutedChats.map(chat => (
              <View key={chat.chatId} style={styles.mutedChatRow}>
                <View style={styles.mutedChatInfo}>
                  <View style={styles.mutedChatAvatar}>
                    <Text style={styles.mutedChatAvatarText}>
                      {chat.chatName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.mutedChatName}>{chat.chatName}</Text>
                    <Text style={styles.mutedChatTime}>
                      Отключено: {formatMuteTime(chat.mutedUntil)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.unmuteButton}
                  onPress={() => {
                    Alert.alert(
                      'Включить уведомления',
                      `Включить уведомления для ${chat.chatName}?`,
                      [
                        { text: 'Отмена', style: 'cancel' },
                        { text: 'Включить', onPress: () => unmuteChat(chat.chatId) },
                      ]
                    );
                  }}
                >
                  <Ionicons name="notifications" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            Push-уведомления работают даже когда приложение закрыто. 
            Для их работы необходимо разрешить уведомления в настройках устройства.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sound Picker Modal */}
      <Modal
        visible={showSoundPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSoundPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите звук</Text>
              <TouchableOpacity onPress={() => setShowSoundPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {SOUNDS.map(sound => (
              <TouchableOpacity
                key={sound.key}
                style={[
                  styles.soundOption,
                  selectedSound === sound.key && styles.soundOptionSelected,
                ]}
                onPress={() => {
                  setSelectedSound(sound.key);
                  setShowSoundPicker(false);
                }}
              >
                <Ionicons 
                  name={sound.icon as any} 
                  size={24} 
                  color={selectedSound === sound.key ? COLORS.primary : COLORS.text} 
                />
                <Text style={[
                  styles.soundName,
                  selectedSound === sound.key && styles.soundNameSelected,
                ]}>
                  {sound.name}
                </Text>
                {selectedSound === sound.key && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyMuted: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyMutedText: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 12,
  },
  emptyMutedSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  mutedChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  mutedChatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mutedChatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedChatAvatarText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mutedChatName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  mutedChatTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  unmuteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  soundOptionSelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  soundName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  soundNameSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
