import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './colors';
import { MessageItemProps } from './types';

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  messages,
  playingVoice,
  onLongPress,
  onPlayVoice,
}) => {
  const isOwn = message.sender_id === currentUserId;
  const replyMessage = message.reply_to_id 
    ? messages.find(m => m.id === message.reply_to_id) 
    : null;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Pressable
      onLongPress={() => onLongPress(message)}
      style={[styles.container, isOwn && styles.ownMessage]}
    >
      {message.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={12} color={COLORS.warning} />
        </View>
      )}
      
      {replyMessage && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyName}>{replyMessage.sender_username}</Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {replyMessage.content}
          </Text>
        </View>
      )}
      
      {!isOwn && (
        <Text style={styles.senderName}>{message.sender_username}</Text>
      )}

      {message.is_forwarded && (
        <View style={styles.forwardedIndicator}>
          <Ionicons name="arrow-redo" size={12} color={COLORS.textSecondary} />
          <Text style={styles.forwardedText}>
            Переслано от {message.forwarded_from}
          </Text>
        </View>
      )}
      
      {message.message_type === 'sticker' && (
        <Text style={styles.stickerMessage}>{message.content}</Text>
      )}
      
      {message.message_type === 'voice' && (
        <TouchableOpacity
          style={styles.voiceMessage}
          onPress={() => message.media_url && onPlayVoice(message.media_url, message.id)}
        >
          <Ionicons 
            name={playingVoice === message.id ? "pause" : "play"} 
            size={24} 
            color={isOwn ? "#FFF" : COLORS.primary} 
          />
          <View style={styles.voiceWaveform}>
            {[...Array(12)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.voiceBar, 
                  { 
                    height: 8 + Math.random() * 16,
                    backgroundColor: isOwn ? "#FFF" : COLORS.primary,
                    opacity: playingVoice === message.id ? 1 : 0.5
                  }
                ]} 
              />
            ))}
          </View>
          <Text style={[styles.voiceDuration, isOwn && { color: '#FFF' }]}>
            {message.content.match(/\d+:\d+/)?.[0] || '0:00'}
          </Text>
        </TouchableOpacity>
      )}
      
      {message.message_type === 'image' && message.media_url && (
        <Image source={{ uri: message.media_url }} style={styles.messageImage} />
      )}
      
      {message.message_type !== 'sticker' && message.message_type !== 'voice' && (
        <LinearGradient
          colors={isOwn 
            ? [COLORS.primary, COLORS.primaryLight] 
            : [COLORS.surfaceLight, COLORS.surfaceLight]
          }
          style={styles.messageBubble}
        >
          <Text style={styles.messageText}>{message.content}</Text>
          <View style={styles.messageFooter}>
            {message.is_edited && (
              <Text style={styles.editedLabel}>ред.</Text>
            )}
            <Text style={styles.messageTime}>
              {formatTime(message.timestamp)}
            </Text>
          </View>
        </LinearGradient>
      )}
      
      {(message.message_type === 'sticker' || message.message_type === 'voice') && (
        <Text style={styles.messageTimeAlt}>
          {formatTime(message.timestamp)}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  pinnedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  replyPreview: {
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  replyName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  replyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  forwardedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  forwardedText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  editedLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  messageTimeAlt: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  stickerMessage: {
    fontSize: 48,
    lineHeight: 56,
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  voiceWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  voiceBar: {
    width: 3,
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    minWidth: 36,
  },
});

export default MessageItem;
