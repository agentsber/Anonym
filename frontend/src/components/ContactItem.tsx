import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Message } from '../types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

interface ContactItemProps {
  contact: User;
  lastMessage?: Message;
  unreadCount?: number;
  onPress: () => void;
}

export const ContactItem: React.FC<ContactItemProps> = ({
  contact,
  lastMessage,
  unreadCount = 0,
  onPress,
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return weekdays[date.getDay()];
    } else {
      return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
    }
  };

  // Generate avatar color based on username
  const getAvatarColor = (name: string) => {
    const colors = [
      ['#6C5CE7', '#A29BFE'],
      ['#00D9A5', '#00B894'],
      ['#FF6B6B', '#EE5A24'],
      ['#FDA7DF', '#D980FA'],
      ['#1289A7', '#0652DD'],
      ['#F79F1F', '#EE5A24'],
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const avatarColors = getAvatarColor(contact.username);
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={avatarColors}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>
          {contact.username.charAt(0).toUpperCase()}
        </Text>
      </LinearGradient>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username} numberOfLines={1}>
            {contact.username}
          </Text>
          {lastMessage && (
            <Text style={styles.time}>
              {formatTime(lastMessage.timestamp)}
            </Text>
          )}
        </View>
        
        <View style={styles.messageRow}>
          {lastMessage?.type === 'media' ? (
            <View style={styles.mediaPreview}>
              <Ionicons name="image" size={14} color={COLORS.textSecondary} />
              <Text style={styles.lastMessage}>Фото</Text>
            </View>
          ) : (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastMessage?.content || 'Начните диалог...'}
            </Text>
          )}
          {unreadCount > 0 && (
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  time: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
  },
  badge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 7,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
