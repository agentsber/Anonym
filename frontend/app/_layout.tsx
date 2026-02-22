import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/stores/authStore';
import { useSecurityStore } from '../src/stores/securityStore';

const queryClient = new QueryClient();

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  primary: '#6C5CE7',
  text: '#FFFFFF',
};

function RootLayoutContent() {
  const { initialize: initAuth, isInitialized: authInitialized, isLoading: authLoading, user } = useAuthStore();
  const { initialize: initSecurity, isInitialized: securityInitialized, isLocked, isPinSet, lock } = useSecurityStore();

  useEffect(() => {
    initAuth();
    initSecurity();
  }, []);

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
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ title: 'Регистрация', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="auth/login" options={{ title: 'Вход', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="chat/[contactId]" options={{ title: 'Чат', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="search" options={{ title: 'Поиск', headerBackTitle: 'Назад', presentation: 'modal' }} />
        <Stack.Screen name="security/lock" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="security/setup-pin" options={{ title: 'Установка PIN', headerBackTitle: 'Назад' }} />
      </Stack>
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
