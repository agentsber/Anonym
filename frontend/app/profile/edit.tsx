import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../../src/stores/authStore';
import { usersApi } from '../../src/services/api';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const profile = await usersApi.getProfile(user.id);
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setBirthday(profile.birthday || '');
      setAvatarUrl(profile.avatar_url || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Ошибка', 'Нужен доступ к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingPhoto(true);
        
        const uri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        
        // Upload avatar
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://private-social-18.preview.emergentagent.com'}/api/upload/avatar`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user?.id,
              image_data: base64,
            }),
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.url);
          Alert.alert('Успешно', 'Фото обновлено');
        } else {
          throw new Error('Upload failed');
        }
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      Alert.alert('Ошибка', 'Не удалось загрузить фото');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await usersApi.updateProfile(user.id, {
        display_name: displayName,
        bio: bio,
        birthday: birthday,
        avatar_url: avatarUrl || undefined,
      });
      
      Alert.alert('Успешно', 'Профиль обновлён');
      router.back();
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось сохранить');
    } finally {
      setIsSaving(false);
    }
  };

  const getAvatarColors = (): [string, string] => {
    if (!user?.username) return [COLORS.primary, COLORS.primaryLight];
    const colors: [string, string][] = [
      [COLORS.primary, COLORS.primaryLight],
      ['#00D9A5', '#00B894'],
      ['#FF6B6B', '#EE5A24'],
      ['#FDA7DF', '#D980FA'],
    ];
    const index = user.username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Редактировать',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.saveButton}>Готово</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.avatarImage}
              />
            ) : (
              <LinearGradient
                colors={getAvatarColors()}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <TouchableOpacity 
              style={styles.changePhotoButton} 
              onPress={handleChangePhoto}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.changePhotoText}>Изменить фото</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Введите имя"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>О себе</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Расскажите о себе"
                placeholderTextColor={COLORS.textSecondary}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>День рождения</Text>
              <TextInput
                style={styles.input}
                value={birthday}
                onChangeText={setBirthday}
                placeholder="дд.мм.гггг"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={10}
              />
            </View>
          </View>

          {/* Username Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Имя пользователя</Text>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/profile/edit-username' as any)}
            >
              <View>
                <Text style={styles.menuItemTitle}>@{user?.username}</Text>
                <Text style={styles.menuItemSubtitle}>Нажмите для изменения</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Вы можете изменить имя пользователя раз в 14 дней.
              Люди смогут найти вас по новому имени.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  saveButton: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  changePhotoButton: {
    marginTop: 12,
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  menuItemTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoSection: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
