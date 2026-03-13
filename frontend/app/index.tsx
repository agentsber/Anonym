import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/stores/authStore';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function WelcomeScreen() {
  const { user, isInitialized } = useAuthStore();
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(40)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequential animation on mount
    Animated.sequence([
      // Logo bounce in with rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      // Title fade in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Subtitle fade in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Features slide in
      Animated.parallel([
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(featuresTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Buttons slide in
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

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  React.useEffect(() => {
    // Wait for auth to initialize, then redirect if user exists
    if (isInitialized && user) {
      console.log('User found, redirecting to tabs...', user.username);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    }
  }, [user, isInitialized]);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoScale },
                { rotate: spin },
              ],
            },
          ]}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.logo}
            >
              <Ionicons name="shield-checkmark" size={64} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
          
          <Animated.Text style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
            Anonym X
          </Animated.Text>
          <Animated.Text style={[
            styles.subtitle,
            { opacity: subtitleOpacity },
          ]}>
            Безопасный мессенджер{'\n'}со сквозным шифрованием
          </Animated.Text>
          
          <Animated.View style={[
            styles.features,
            {
              opacity: featuresOpacity,
              transform: [{ translateY: featuresTranslateY }],
            },
          ]}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="lock-closed" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>E2E{'\n'}шифрование</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="eye-off" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>Полная{'\n'}приватность</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="key" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>Локальные{'\n'}ключи</Text>
            </View>
          </Animated.View>
        </View>
        
        <Animated.View style={[
          styles.buttons,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          },
        ]}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/auth/register')}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              activeOpacity={1}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Начать</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.secondaryButtonText}>У меня уже есть аккаунт</Text>
          </TouchableOpacity>
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
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 48,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
