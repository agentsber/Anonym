import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
  onImagePress?: (uri: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const maxMediaWidth = screenWidth * 0.65;

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onImagePress }) => {
  const isOutgoing = message.isOutgoing;
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };
  
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Ionicons name="time-outline" size={14} color={isOutgoing ? 'rgba(255,255,255,0.7)' : '#666'} />;
      case 'sent':
        return <Ionicons name="checkmark" size={14} color={isOutgoing ? 'rgba(255,255,255,0.7)' : '#666'} />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color="#4CAF50" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color="#2196F3" />;
      default:
        return null;
    }
  };

  const renderMediaContent = () => {
    if (message.message_type === 'image') {
      const imageUri = message.content.startsWith('data:') 
        ? message.content 
        : `data:image/jpeg;base64,${message.content}`;
      
      return (
        <TouchableOpacity 
          onPress={() => onImagePress?.(imageUri)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }
    
    if (message.message_type === 'video') {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="play-circle" size={48} color="#FFF" />
          <Text style={styles.videoText}>Видео</Text>
        </View>
      );
    }
    
    return null;
  };
  
  const isMedia = message.message_type === 'image' || message.message_type === 'video';
  
  return (
    <View style={[styles.container, isOutgoing ? styles.outgoing : styles.incoming]}>
      <View style={[
        styles.bubble, 
        isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
        isMedia && styles.mediaBubble
      ]}>
        {isMedia ? (
          <>
            {renderMediaContent()}
            <View style={[styles.mediaFooter, isOutgoing ? styles.outgoingMediaFooter : styles.incomingMediaFooter]}>
              <Text style={[styles.time, isOutgoing ? styles.outgoingTime : styles.incomingTime]}>
                {formatTime(message.timestamp)}
              </Text>
              {isOutgoing && <View style={styles.statusIcon}>{getStatusIcon()}</View>}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.messageText, isOutgoing ? styles.outgoingText : styles.incomingText]}>
              {message.content}
            </Text>
            <View style={styles.footer}>
              <Text style={[styles.time, isOutgoing ? styles.outgoingTime : styles.incomingTime]}>
                {formatTime(message.timestamp)}
              </Text>
              {isOutgoing && <View style={styles.statusIcon}>{getStatusIcon()}</View>}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  outgoing: {
    alignItems: 'flex-end',
  },
  incoming: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  mediaBubble: {
    padding: 4,
    overflow: 'hidden',
  },
  outgoingBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  incomingBubble: {
    backgroundColor: '#E8E8E8',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  outgoingText: {
    color: '#FFFFFF',
  },
  incomingText: {
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  mediaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outgoingMediaFooter: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -30,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 0,
  },
  incomingMediaFooter: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginTop: -30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 14,
  },
  time: {
    fontSize: 11,
  },
  outgoingTime: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  incomingTime: {
    color: '#666',
  },
  statusIcon: {
    marginLeft: 4,
  },
  mediaImage: {
    width: maxMediaWidth,
    height: maxMediaWidth * 0.75,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
  },
  videoPlaceholder: {
    width: maxMediaWidth,
    height: maxMediaWidth * 0.6,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    color: '#FFF',
    marginTop: 8,
    fontSize: 14,
  },
});
