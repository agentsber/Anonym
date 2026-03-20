import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Message } from '../types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  success: '#00D9A5',
  danger: '#EF4444',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: 'rgba(255,255,255,0.06)',
};

interface SwipeableContactItemProps {
  contact: User;
  lastMessage?: Message;
  unreadCount?: number;
  onPress: () => void;
  onDelete: (contactId: string) => void;
}

export const SwipeableContactItem: React.FC<SwipeableContactItemProps> = ({
  contact,
  lastMessage,
  unreadCount = 0,
  onPress,
  onDelete,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

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

  const getAvatarColor = (name: string): [string, string] => {
    const colors: [string, string][] = [
      ['#7C3AED', '#A78BFA'],
      ['#00D9A5', '#00B894'],
      ['#FF6B6B', '#EE5A24'],
      ['#FDA7DF', '#D980FA'],
      ['#1289A7', '#0652DD'],
      ['#F79F1F', '#EE5A24'],
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить чат',
      `Удалить чат с ${contact.username}?`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            swipeableRef.current?.close();
            onDelete(contact.id);
          },
        },
      ]
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.rightActions, { opacity }]}>
        <RectButton style={styles.deleteButton} onPress={handleDelete}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          </Animated.View>
          <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
            Удалить
          </Animated.Text>
        </RectButton>
      </Animated.View>
    );
  };

  const avatarColors = getAvatarColor(contact.username);

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
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
            {lastMessage?.message_type === 'image' || lastMessage?.message_type === 'video' ? (
              <View style={styles.mediaPreview}>
                <Ionicons name="image" size={14} color={COLORS.textSecondary} />
                <Text style={styles.lastMessage}>Фото</Text>
              </View>
            ) : lastMessage?.message_type === 'audio' || lastMessage?.message_type === 'voice' ? (
              <View style={styles.mediaPreview}>
                <Ionicons name="mic" size={14} color={COLORS.textSecondary} />
                <Text style={styles.lastMessage}>Голосовое</Text>
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
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
    gap: 6,
  },
  lastMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
  },
  badge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    height: '100%',
    flexDirection: 'column',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
