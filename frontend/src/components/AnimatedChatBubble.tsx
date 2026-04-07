import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Pressable,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Message } from '../types';

const COLORS = {
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.08)',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#00D9A5',
  error: '#FF6B6B',
};

interface ChatBubbleProps {
  message: Message;
  onImagePress?: (uri: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message, forEveryone: boolean) => void;
  replyMessage?: Message;
  isNew?: boolean;
  index?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const maxMediaWidth = screenWidth * 0.65;

export const AnimatedChatBubble: React.FC<ChatBubbleProps> = memo(({ 
  message, 
  onImagePress,
  onReply,
  onEdit,
  onDelete,
  replyMessage,
  isNew = false,
  index = 0,
}) => {
  const [showActions, setShowActions] = useState(false);
  const isOutgoing = message.isOutgoing;
  
  // Voice playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(message.duration || 0);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(isOutgoing ? 50 : -50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  
  // Sending animation
  const sendingOpacity = useRef(new Animated.Value(message.status === 'sending' ? 0.7 : 1)).current;
  
  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  useEffect(() => {
    // Entrance animation with stagger
    const delay = isNew ? 0 : index * 30;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Update sending opacity when status changes
  useEffect(() => {
    Animated.timing(sendingOpacity, {
      toValue: message.status === 'sending' ? 0.7 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message.status]);
  
  // Voice playback functions
  const togglePlayback = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } else if (message.media_url) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: message.media_url },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        
        soundRef.current = sound;
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Failed to play voice message:', err);
    }
  };
  
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000);
      if (status.durationMillis) {
        setPlaybackDuration(status.durationMillis / 1000);
      }
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        soundRef.current?.setPositionAsync(0);
      }
    }
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };
  
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <SendingIndicator />;
      case 'sent':
        return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.6)" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color={COLORS.success} />;
      default:
        return null;
    }
  };

  const handleLongPress = () => {
    setShowActions(true);
  };

  const handleDeletePress = () => {
    setShowActions(false);
    Alert.alert(
      'Удалить сообщение',
      'Выберите опцию удаления',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Только у меня', onPress: () => onDelete?.(message, false) },
        { text: 'У всех', onPress: () => onDelete?.(message, true), style: 'destructive' },
      ]
    );
  };

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => message.media_url && onImagePress?.(message.media_url)}
          >
            {message.media_url && (
              <Image
                source={{ uri: message.media_url }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            )}
            {message.content && (
              <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
                {message.content}
              </Text>
            )}
          </TouchableOpacity>
        );
      
      case 'voice':
      case 'audio':
        const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;
        return (
          <View style={styles.voiceMessage}>
            <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={20} 
                color={COLORS.text} 
              />
            </TouchableOpacity>
            <View style={styles.waveformContainer}>
              <View style={styles.waveform}>
                {[...Array(25)].map((_, i) => {
                  const barProgress = (i / 25) * 100;
                  const isActive = barProgress <= progress;
                  return (
                    <View 
                      key={i} 
                      style={[
                        styles.waveBar, 
                        { 
                          height: 4 + Math.sin(i * 0.5) * 12 + Math.random() * 4,
                          backgroundColor: isActive 
                            ? (isOutgoing ? 'rgba(255,255,255,0.9)' : COLORS.primary)
                            : 'rgba(255,255,255,0.3)'
                        }
                      ]} 
                    />
                  );
                })}
              </View>
            </View>
            <Text style={styles.voiceDuration}>
              {isPlaying ? formatDuration(playbackPosition) : formatDuration(playbackDuration)}
            </Text>
          </View>
        );
      
      default:
        return (
          <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
            {message.content}
          </Text>
        );
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        isOutgoing ? styles.outgoingContainer : styles.incomingContainer,
        {
          opacity: Animated.multiply(fadeAnim, sendingOpacity),
          transform: [
            { translateX: slideAnim },
            { scale: Animated.multiply(scaleAnim, pressScale) },
          ],
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        {isOutgoing ? (
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.outgoingBubble]}
          >
            {/* Reply preview */}
            {replyMessage && (
              <View style={[styles.replyPreview, styles.outgoingReplyPreview]}>
                <View style={styles.replyLine} />
                <View style={styles.replyContent}>
                  <Text style={styles.replyName}>Ответ</Text>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {replyMessage.content}
                  </Text>
                </View>
              </View>
            )}
            
            {renderContent()}
            
            <View style={styles.messageFooter}>
              {message.edited && (
                <Text style={[styles.editedLabel, styles.outgoingEditedLabel]}>изм.</Text>
              )}
              <Text style={[styles.timestamp, styles.outgoingTimestamp]}>
                {formatTime(message.timestamp)}
              </Text>
              {isOutgoing && getStatusIcon()}
            </View>
            
            {message.expires_at && (
              <View style={styles.timerBadge}>
                <Ionicons name="timer-outline" size={10} color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.incomingBubble]}>
            {/* Reply preview */}
            {replyMessage && (
              <View style={styles.replyPreview}>
                <View style={[styles.replyLine, { backgroundColor: COLORS.primary }]} />
                <View style={styles.replyContent}>
                  <Text style={[styles.replyName, { color: COLORS.primary }]}>Ответ</Text>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {replyMessage.content}
                  </Text>
                </View>
              </View>
            )}
            
            {renderContent()}
            
            <View style={styles.messageFooter}>
              {message.edited && (
                <Text style={styles.editedLabel}>изм.</Text>
              )}
              <Text style={styles.timestamp}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
            
            {message.expires_at && (
              <View style={[styles.timerBadge, { backgroundColor: COLORS.surface }]}>
                <Ionicons name="timer-outline" size={10} color={COLORS.textSecondary} />
              </View>
            )}
          </View>
        )}
      </Pressable>
      
      {/* Actions Modal */}
      {showActions && (
        <Pressable 
          style={styles.actionsOverlay} 
          onPress={() => setShowActions(false)}
        >
          <Animated.View style={[
            styles.actionsMenu,
            isOutgoing ? styles.actionsMenuRight : styles.actionsMenuLeft,
          ]}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => { setShowActions(false); onReply?.(message); }}
            >
              <Ionicons name="arrow-undo" size={18} color={COLORS.text} />
              <Text style={styles.actionText}>Ответить</Text>
            </TouchableOpacity>
            
            {isOutgoing && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => { setShowActions(false); onEdit?.(message); }}
              >
                <Ionicons name="pencil" size={18} color={COLORS.text} />
                <Text style={styles.actionText}>Изменить</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteAction]}
              onPress={handleDeletePress}
            >
              <Ionicons name="trash" size={18} color={COLORS.error} />
              <Text style={[styles.actionText, { color: COLORS.error }]}>Удалить</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      )}
    </Animated.View>
  );
}, (prev, next) => {
  return prev.message.id === next.message.id && 
         prev.message.status === next.message.status &&
         prev.message.edited === next.message.edited;
});

// Animated sending indicator
const SendingIndicator = () => {
  const rotation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  return (
    <Animated.View style={{
      transform: [{
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      }],
    }}>
      <Ionicons name="sync" size={14} color="rgba(255,255,255,0.6)" />
    </Animated.View>
  );
};

// Re-export original ChatBubble for compatibility
export { ChatBubble } from './ChatBubble';

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    marginHorizontal: 12,
    maxWidth: '80%',
  },
  outgoingContainer: {
    alignSelf: 'flex-end',
  },
  incomingContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
  },
  outgoingBubble: {
    borderBottomRightRadius: 6,
  },
  incomingBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.text,
  },
  outgoingText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  outgoingTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  editedLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  outgoingEditedLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  outgoingReplyPreview: {
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  replyLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  mediaImage: {
    width: maxMediaWidth,
    height: maxMediaWidth * 0.75,
    borderRadius: 12,
    marginBottom: 6,
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    paddingVertical: 4,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waveformContainer: {
    flex: 1,
    marginRight: 8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    gap: 2,
  },
  waveBar: {
    width: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    minWidth: 35,
  },
  timerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  actionsMenu: {
    position: 'absolute',
    top: -10,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 14,
    padding: 6,
    minWidth: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionsMenuRight: {
    right: 0,
  },
  actionsMenuLeft: {
    left: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  deleteAction: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
    paddingTop: 14,
  },
});
