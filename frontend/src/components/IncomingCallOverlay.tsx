import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallStore } from '../stores/callStore';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = {
  background: '#1A1A1A',
  primary: '#6C5CE7',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
};

export default function IncomingCallOverlay() {
  const router = useRouter();
  const { incomingCall, status, answerCall, rejectCall } = useCallStore();

  useEffect(() => {
    if (incomingCall && status === 'ringing') {
      // Vibrate for incoming call
      if (Platform.OS !== 'web') {
        const pattern = [0, 500, 200, 500, 200, 500];
        Vibration.vibrate(pattern, true);
      }

      return () => {
        if (Platform.OS !== 'web') {
          Vibration.cancel();
        }
      };
    }
  }, [incomingCall, status]);

  const handleAccept = async () => {
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
    await answerCall();
    router.push('/video-call');
  };

  const handleReject = async () => {
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
    await rejectCall();
  };

  if (!incomingCall || status !== 'ringing') {
    return null;
  }

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {incomingCall.callerUsername.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.callerName}>{incomingCall.callerUsername}</Text>
          <Text style={styles.callType}>
            {incomingCall.callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
            >
              <Ionicons name="close" size={28} color={COLORS.text} />
              <Text style={styles.actionText}>Отклонить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Ionicons name="videocam" size={28} color={COLORS.text} />
              <Text style={styles.actionText}>Принять</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: screenWidth - 40,
    maxWidth: 350,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  callerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  callType: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 4,
  },
});
