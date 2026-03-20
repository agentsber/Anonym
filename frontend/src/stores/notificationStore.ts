import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../services/api';

export type NotificationSound = 'default' | 'chime' | 'bell' | 'pop' | 'none';

interface MutedChat {
  chatId: string;
  chatName: string;
  mutedUntil: number | null; // null = forever, timestamp = until that time
}

interface NotificationSettings {
  // Global settings
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  selectedSound: NotificationSound;
  vibrationEnabled: boolean;
  showPreview: boolean;
  
  // Push token
  pushToken: string | null;
  
  // Muted chats
  mutedChats: MutedChat[];
  
  // Actions
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSelectedSound: (sound: NotificationSound) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setShowPreview: (show: boolean) => void;
  
  // Push token actions
  registerForPushNotifications: (userId: string) => Promise<string | null>;
  setPushToken: (token: string | null) => void;
  
  // Muted chats actions
  muteChat: (chatId: string, chatName: string, duration?: number) => void;
  unmuteChat: (chatId: string) => void;
  isChatMuted: (chatId: string) => boolean;
  getMutedChats: () => MutedChat[];
  
  // Notification display
  showLocalNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<void>;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotificationStore = create<NotificationSettings>()(
  persist(
    (set, get) => ({
      // Default settings
      notificationsEnabled: true,
      soundEnabled: true,
      selectedSound: 'default',
      vibrationEnabled: true,
      showPreview: true,
      pushToken: null,
      mutedChats: [],

      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
      },

      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
      },

      setSelectedSound: (sound) => {
        set({ selectedSound: sound });
      },

      setVibrationEnabled: (enabled) => {
        set({ vibrationEnabled: enabled });
      },

      setShowPreview: (show) => {
        set({ showPreview: show });
      },

      setPushToken: (token) => {
        set({ pushToken: token });
      },

      registerForPushNotifications: async (userId: string) => {
        try {
          if (!Device.isDevice) {
            console.log('Push notifications require a physical device');
            return null;
          }

          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus !== 'granted') {
            console.log('Push notification permission denied');
            return null;
          }

          // Get Expo push token
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'your-project-id', // Will be auto-detected in EAS builds
          });
          const token = tokenData.data;

          // Save token to backend
          try {
            await api.post('/users/push-token', {
              user_id: userId,
              push_token: token,
              platform: Platform.OS,
            });
          } catch (error) {
            console.error('Failed to save push token to server:', error);
          }

          set({ pushToken: token });

          // Configure Android channel
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('messages', {
              name: 'Сообщения',
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#6C5CE7',
              sound: 'default',
            });

            await Notifications.setNotificationChannelAsync('calls', {
              name: 'Звонки',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 500, 500, 500],
              lightColor: '#00D9A5',
              sound: 'default',
            });
          }

          return token;
        } catch (error) {
          console.error('Error registering for push notifications:', error);
          return null;
        }
      },

      muteChat: (chatId, chatName, duration) => {
        const mutedUntil = duration ? Date.now() + duration : null;
        const { mutedChats } = get();
        
        // Remove if already exists
        const filtered = mutedChats.filter(c => c.chatId !== chatId);
        
        set({
          mutedChats: [...filtered, { chatId, chatName, mutedUntil }],
        });
      },

      unmuteChat: (chatId) => {
        const { mutedChats } = get();
        set({
          mutedChats: mutedChats.filter(c => c.chatId !== chatId),
        });
      },

      isChatMuted: (chatId) => {
        const { mutedChats, notificationsEnabled } = get();
        
        if (!notificationsEnabled) return true;
        
        const muted = mutedChats.find(c => c.chatId === chatId);
        if (!muted) return false;
        
        // Check if mute has expired
        if (muted.mutedUntil && muted.mutedUntil < Date.now()) {
          // Auto-unmute expired chats
          get().unmuteChat(chatId);
          return false;
        }
        
        return true;
      },

      getMutedChats: () => {
        const { mutedChats } = get();
        // Filter out expired mutes
        const now = Date.now();
        return mutedChats.filter(c => !c.mutedUntil || c.mutedUntil > now);
      },

      showLocalNotification: async (title, body, data = {}) => {
        const { notificationsEnabled, soundEnabled, vibrationEnabled, showPreview } = get();
        
        if (!notificationsEnabled) return;

        const notificationBody = showPreview ? body : 'Новое сообщение';

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: notificationBody,
            data,
            sound: soundEnabled ? 'default' : undefined,
            vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
          },
          trigger: null, // Show immediately
        });
      },
    }),
    {
      name: 'notification-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
        soundEnabled: state.soundEnabled,
        selectedSound: state.selectedSound,
        vibrationEnabled: state.vibrationEnabled,
        showPreview: state.showPreview,
        pushToken: state.pushToken,
        mutedChats: state.mutedChats,
      }),
    }
  )
);

// Helper function to handle incoming notifications
export const setupNotificationListeners = (
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) => {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response:', response);
    onNotificationResponse?.(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};
