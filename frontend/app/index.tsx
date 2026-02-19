import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const { user } = useAuthStore();

  React.useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.logo}
            >
              <Ionicons name="shield-checkmark" size={64} color="#FFFFFF" />
            </LinearGradient>
          </View>
          
          <Text style={styles.title}>Anonym X</Text>
          <Text style={styles.subtitle}>
            Безопасный мессенджер{'\n'}со сквозным шифрованием
          </Text>
          
          <View style={styles.features}>
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
          </View>
        </View>
        
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/register')}
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
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.secondaryButtonText}>У меня уже есть аккаунт</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 24,
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
