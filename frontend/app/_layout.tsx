import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/stores/authStore';
import { useSecurityStore } from '../src/stores/securityStore';
import { useCallStore } from '../src/stores/callStore';
import { useNotificationStore, setupNotificationListeners } from '../src/stores/notificationStore';
import IncomingCallOverlay from '../src/components/IncomingCallOverlay';
import api from '../src/services/api';

const queryClient = new QueryClient();

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  primary: '#6C5CE7',
  text: '#FFFFFF',
};

function RootLayoutContent() {
  const router = useRouter();
  const { initialize: initAuth, isInitialized: authInitialized, isLoading: authLoading, user } = useAuthStore();
  const { initialize: initSecurity, isInitialized: securityInitialized, isLocked, isPinSet, lock } = useSecurityStore();
  const { setUserId, handleIncomingCall, handleCallAnswered, handleCallRejected, handleCallEnded, handleIceCandidate, handleMediaUpdate } = useCallStore();
  const { registerForPushNotifications, showLocalNotification, isChatMuted } = useNotificationStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    initAuth();
    initSecurity();
  }, []);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id);
      
      // Setup notification listeners
      const cleanup = setupNotificationListeners(
        // On notification received (foreground)
        (notification) => {
          console.log('Notification in foreground:', notification);
        },
        // On notification tapped
        (response) => {
          const data = response.notification.request.content.data;
          if (data?.type === 'message' && data?.chat_id) {
            router.push(`/chat/${data.chat_id}` as any);
          }
        }
      );
      
      return cleanup;
    }
  }, [user?.id]);

  // Initialize call store with user ID
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user?.id]);

  // Connect WebSocket for call signaling
  useEffect(() => {
    if (!user?.id) return;

    const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + `/ws/${user.id}`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected for calls');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'incoming_call':
                handleIncomingCall(data);
                break;
              case 'call_answered':
                handleCallAnswered(data);
                break;
              case 'call_rejected':
                handleCallRejected();
                break;
              case 'call_ended':
                handleCallEnded(data);
                break;
              case 'ice_candidate':
                handleIceCandidate(data);
                break;
              case 'call_media_update':
                handleMediaUpdate(data);
                break;
            }
          } catch (e) {
            // Not a JSON message, might be pong or other
          }
        };

        ws.onclose = () => {
          console.log('WebSocket closed, reconnecting...');
          setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setTimeout(connect, 5000);
      }
    };

    connect();

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.id]);

  // Lock app when going to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (isPinSet) {
          lock();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isPinSet, lock]);

  if (!authInitialized || !securityInitialized || authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen 
          name="auth/register" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: 300,
          }} 
        />
        <Stack.Screen name="auth/login" options={{ title: 'Вход', headerBackTitle: 'Назад' }} />
        <Stack.Screen 
          name="chat/[contactId]" 
          options={{ 
            title: 'Чат', 
            headerBackTitle: 'Назад',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="search" 
          options={{ 
            title: 'Поиск', 
            headerBackTitle: 'Назад', 
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="notification-settings" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="record-video" 
          options={{ 
            headerShown: false, 
            animation: 'slide_from_bottom',
            animationDuration: 300,
          }} 
        />
        <Stack.Screen name="security/lock" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="security/setup-pin" options={{ title: 'Установка PIN', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="video-call" options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      <IncomingCallOverlay />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutContent />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
