import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/stores/authStore';
import { videosApi } from '../src/services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const COLORS = {
  background: '#000000',
  surface: '#1A1A1A',
  primary: '#6C5CE7',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
};

const MAX_VIDEO_DURATION = 60; // 60 seconds max
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB max

export default function RecordVideoScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const cameraRef = useRef<CameraView>(null);
  
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'contacts' | 'private'>('public');
  
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    if (!micPermission?.granted) {
      await requestMicPermission();
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    
    try {
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= MAX_VIDEO_DURATION - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_VIDEO_DURATION,
      });
      
      if (video?.uri) {
        setVideoUri(video.uri);
      }
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Ошибка', 'Не удалось записать видео');
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;
    
    try {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      setIsRecording(false);
      cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: MAX_VIDEO_DURATION,
      });
      
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size
        if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
          Alert.alert('Ошибка', 'Видео слишком большое. Максимум 50MB');
          return;
        }
        
        setVideoUri(asset.uri);
      }
    } catch (error) {
      console.error('Pick video error:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать видео');
    }
  };

  const retakeVideo = () => {
    setVideoUri(null);
    setDescription('');
  };

  const publishVideo = async () => {
    if (!videoUri || !user) return;
    
    setIsUploading(true);
    
    try {
      // Read video file as base64
      const base64 = await FileSystem.readAsStringAsync(videoUri, {
        encoding: 'base64',
      });
      
      await videosApi.upload({
        user_id: user.id,
        description: description.trim(),
        privacy,
        video_data: base64,
      });
      
      Alert.alert('Успешно', 'Видео опубликовано!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить видео');
    } finally {
      setIsUploading(false);
      setShowPublishModal(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Permission denied view
  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.permissionContainer}>
          <Ionicons name="videocam-off-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.permissionTitle}>Нужен доступ к камере</Text>
          <Text style={styles.permissionText}>
            Для записи видео необходимо разрешить доступ к камере и микрофону
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Разрешить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Video preview view
  if (videoUri) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <Video
          source={{ uri: videoUri }}
          style={styles.previewVideo}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
        />
        
        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.closeButton} onPress={retakeVideo}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        {/* Bottom controls */}
        <View style={styles.previewBottomControls}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakeVideo}>
            <Ionicons name="refresh" size={24} color={COLORS.text} />
            <Text style={styles.retakeText}>Переснять</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.publishButton} 
            onPress={() => setShowPublishModal(true)}
          >
            <Text style={styles.publishText}>Далее</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        {/* Publish Modal */}
        <Modal
          visible={showPublishModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPublishModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.publishModal}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPublishModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Публикация</Text>
                <View style={{ width: 24 }} />
              </View>
              
              <TextInput
                style={styles.descriptionInput}
                placeholder="Добавьте описание..."
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={200}
              />
              
              <Text style={styles.sectionTitle}>Кто может видеть</Text>
              
              <TouchableOpacity 
                style={[styles.privacyOption, privacy === 'public' && styles.privacySelected]}
                onPress={() => setPrivacy('public')}
              >
                <Ionicons name="globe-outline" size={24} color={COLORS.text} />
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>Все</Text>
                  <Text style={styles.privacyDesc}>Видео увидят все пользователи</Text>
                </View>
                {privacy === 'public' && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.privacyOption, privacy === 'contacts' && styles.privacySelected]}
                onPress={() => setPrivacy('contacts')}
              >
                <Ionicons name="people-outline" size={24} color={COLORS.text} />
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>Контакты</Text>
                  <Text style={styles.privacyDesc}>Только ваши контакты</Text>
                </View>
                {privacy === 'contacts' && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.privacyOption, privacy === 'private' && styles.privacySelected]}
                onPress={() => setPrivacy('private')}
              >
                <Ionicons name="lock-closed-outline" size={24} color={COLORS.text} />
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>Только я</Text>
                  <Text style={styles.privacyDesc}>Видео будет скрыто от других</Text>
                </View>
                {privacy === 'private' && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                onPress={publishVideo}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={24} color={COLORS.text} />
                    <Text style={styles.uploadText}>Опубликовать</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      >
        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse-outline" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        {/* Recording indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
          </View>
        )}
        
        {/* Progress bar */}
        {isRecording && (
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${(recordingDuration / MAX_VIDEO_DURATION) * 100}%` }
              ]} 
            />
          </View>
        )}
        
        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickVideo}>
            <Ionicons name="images-outline" size={28} color={COLORS.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
          </TouchableOpacity>
          
          <View style={{ width: 56 }} />
        </View>
        
        {/* Hint */}
        <Text style={styles.hint}>
          {isRecording ? 'Нажмите для остановки' : 'Удерживайте для записи до 60 сек'}
        </Text>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    padding: 10,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    marginRight: 8,
  },
  recordingTime: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.error,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    borderColor: COLORS.error,
  },
  recordInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.error,
  },
  recordInnerActive: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  hint: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  previewVideo: {
    flex: 1,
  },
  previewBottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  retakeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  publishText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  publishModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  privacySelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  privacyInfo: {
    flex: 1,
    marginLeft: 14,
  },
  privacyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  privacyDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
