import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isOutgoing = message.isOutgoing;
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Ionicons name="time-outline" size={14} color="#666" />;
      case 'sent':
        return <Ionicons name="checkmark" size={14} color="#666" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color="#4CAF50" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color="#2196F3" />;
      default:
        return null;
    }
  };
  
  return (
    <View style={[styles.container, isOutgoing ? styles.outgoing : styles.incoming]}>
      <View style={[styles.bubble, isOutgoing ? styles.outgoingBubble : styles.incomingBubble]}>
        <Text style={[styles.messageText, isOutgoing ? styles.outgoingText : styles.incomingText]}>
          {message.content}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.time, isOutgoing ? styles.outgoingTime : styles.incomingTime]}>
            {formatTime(message.timestamp)}
          </Text>
          {isOutgoing && <View style={styles.statusIcon}>{getStatusIcon()}</View>}
        </View>
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
  time: {
    fontSize: 11,
  },
  outgoingTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  incomingTime: {
    color: '#666',
  },
  statusIcon: {
    marginLeft: 4,
  },
});
