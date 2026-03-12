import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallStore } from '../src/stores/callStore';
import { useAuthStore } from '../src/stores/authStore';

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

export default function VideoCallScreen() {
  const router = useRouter();
  const { calleeId, calleeName, callType } = useLocalSearchParams<{
    calleeId?: string;
    calleeName?: string;
    callType?: string;
  }>();
  
  const { user } = useAuthStore();
  const {
    callId,
    status,
    isVideoEnabled,
    isAudioEnabled,
    isFrontCamera,
    localStream,
    remoteStream,
    duration,
    otherUser,
    incomingCall,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
    switchCamera,
    setUserId,
  } = useCallStore();

  const [callDuration, setCallDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user?.id]);

  // Start outgoing call if calleeId is provided
  useEffect(() => {
    if (calleeId && user?.id && status === 'idle') {
      const type = callType === 'audio' ? 'audio' : 'video';
      startCall(calleeId, type).catch((error) => {
        console.error('Failed to start call:', error);
        router.back();
      });
    }
  }, [calleeId, user?.id]);

  // Handle duration timer
  useEffect(() => {
    if (status === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [status]);

  // Attach streams to video elements (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [localStream, remoteStream]);

  // Handle call ended
  useEffect(() => {
    if (status === 'ended') {
      const timer = setTimeout(() => {
        router.back();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await endCall();
    router.back();
  };

  const handleAcceptCall = async () => {
    await answerCall();
  };

  const handleRejectCall = async () => {
    await rejectCall();
    router.back();
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'calling':
        return 'Вызов...';
      case 'ringing':
        return 'Входящий звонок';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Звонок завершён';
      default:
        return '';
    }
  };

  const displayName = incomingCall?.callerUsername || otherUser || calleeName || 'Неизвестный';

  // Incoming call screen
  if (status === 'ringing' && incomingCall) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        
        <View style={styles.incomingCallContainer}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <Text style={styles.callerName}>{displayName}</Text>
          <Text style={styles.callStatus}>
            {incomingCall.callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
          </Text>

          <View style={styles.incomingCallActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleRejectCall}
            >
              <Ionicons name="close" size={32} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptCall}
            >
              <Ionicons name="videocam" size={32} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {Platform.OS === 'web' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
            }}
          />
        ) : (
          <View style={styles.noVideoContainer}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.callerName}>{displayName}</Text>
          </View>
        )}
      </View>

      {/* Local Video (Picture in Picture) */}
      {isVideoEnabled && localStream && (
        <View style={styles.localVideoContainer}>
          {Platform.OS === 'web' ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isFrontCamera ? 'scaleX(-1)' : 'none',
                borderRadius: 12,
              }}
            />
          ) : null}
        </View>
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleEndCall}>
          <Ionicons name="chevron-down" size={28} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.callInfo}>
          <Text style={styles.callStatusText}>{getStatusText()}</Text>
          {status === 'connected' && (
            <View style={styles.encryptedBadge}>
              <Ionicons name="lock-closed" size={12} color={COLORS.success} />
              <Text style={styles.encryptedText}>E2E Encrypted</Text>
            </View>
          )}
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {status === 'connected' && (
          <>
            <TouchableOpacity
              style={[styles.controlButton, !isAudioEnabled && styles.controlButtonOff]}
              onPress={toggleAudio}
            >
              <Ionicons
                name={isAudioEnabled ? 'mic' : 'mic-off'}
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, !isVideoEnabled && styles.controlButtonOff]}
              onPress={toggleVideo}
            >
              <Ionicons
                name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Ionicons name="call" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.surface,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    alignItems: 'center',
  },
  callStatusText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,217,165,0.2)',
    borderRadius: 10,
  },
  encryptedText: {
    color: COLORS.success,
    fontSize: 10,
    marginLeft: 4,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonOff: {
    backgroundColor: 'rgba(255,107,107,0.5)',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  incomingCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarTextLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 60,
  },
  incomingCallActions: {
    flexDirection: 'row',
    gap: 60,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
});
