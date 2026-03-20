import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../src/stores/authStore';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.08)',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5B4AD1',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

export default function WelcomeScreen() {
  const { user, isInitialized } = useAuthStore();
  
  const logoScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(40)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (isInitialized && user) {
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    }
  }, [user, isInitialized]);

  return (
    <View style={styles.container}>
      {/* Background gradient orbs */}
      <View style={styles.backgroundOrbs}>
        <LinearGradient
          colors={[COLORS.primary, 'transparent']}
          style={[styles.orb, styles.orb1]}
        />
        <LinearGradient
          colors={[COLORS.primaryLight, 'transparent']}
          style={[styles.orb, styles.orb2]}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoOuter}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.logo}
              >
                <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </Animated.View>
          
          {/* Title & Subtitle */}
          <Animated.View style={[
            styles.textContainer,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}>
            <Text style={styles.title}>Private</Text>
            <Text style={styles.subtitle}>Безопасный мессенджер</Text>
          </Animated.View>
          
          {/* Features - Glass cards */}
          <Animated.View style={[
            styles.features,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureTitle}>E2E шифрование</Text>
              <Text style={styles.featureDesc}>Только вы читаете</Text>
            </View>
            
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="eye-off" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureTitle}>Приватность</Text>
              <Text style={styles.featureDesc}>Нет слежки</Text>
            </View>
            
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="flash" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureTitle}>Быстро</Text>
              <Text style={styles.featureDesc}>Мгновенно</Text>
            </View>
          </Animated.View>
        </View>
        
        {/* Buttons */}
        <Animated.View style={[
          styles.buttons,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          },
        ]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Начать</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.termsText}>
            Продолжая, вы принимаете условия использования
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundOrbs: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.3,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  orb2: {
    width: 250,
    height: 250,
    bottom: 100,
    left: -80,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    marginBottom: 32,
  },
  logoOuter: {
    padding: 4,
    borderRadius: 32,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  features: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
