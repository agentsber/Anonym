import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatStore } from '../../src/stores/chatStore';

const COLORS = {
  background: '#000000',
  surface: 'rgba(18, 18, 22, 0.95)',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  accent: '#22D3EE',
  textSecondary: 'rgba(255, 255, 255, 0.35)',
  border: 'rgba(255, 255, 255, 0.06)',
};

export default function TabLayout() {
  const { unreadCounts } = useChatStore();
  const totalUnread = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingHorizontal: 16,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Чаты',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <Ionicons name="chatbubbles-outline" size={24} color={color} />
              )}
              {totalUnread > 0 && (
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A5A']}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </LinearGradient>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Лента',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <Ionicons name="play-circle-outline" size={24} color={color} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeIconGradient}
                >
                  <Ionicons name="settings" size={20} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <Ionicons name="settings-outline" size={24} color={color} />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
