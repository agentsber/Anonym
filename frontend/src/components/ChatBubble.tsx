import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Pressable,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
  onImagePress?: (uri: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message, forEveryone: boolean) => void;
  replyMessage?: Message;
}

const { width: screenWidth } = Dimensions.get('window');
const maxMediaWidth = screenWidth * 0.65;

export const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  onImagePress,
  onReply,
  onEdit,
  onDelete,
  replyMessage
}) => {
  const [showActions, setShowActions] = useState(false);
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
        return <Ionicons name="checkmark-done" size={14} color={isOutgoing ? 'rgba(255,255,255,0.7)' : '#666'} />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color="#34C759" />;
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
        { text: 'Удалить у себя', onPress: () => onDelete?.(message, false) },
        ...(isOutgoing ? [{ text: 'Удалить у всех', style: 'destructive' as const, onPress: () => onDelete?.(message, true) }] : []),
      ]
    );
  };

  const renderReplyPreview = () => {
    if (!replyMessage) return null;
    
    return (
      <View style={[
        styles.replyPreview,
        isOutgoing ? styles.replyPreviewOutgoing : styles.replyPreviewIncoming
      ]}>
        <View style={[
          styles.replyBar,
          isOutgoing ? styles.replyBarOutgoing : styles.replyBarIncoming
        ]} />
        <View style={styles.replyContent}>
          <Text style={[
            styles.replyName,
            isOutgoing ? styles.replyNameOutgoing : styles.replyNameIncoming
          ]}>
            {replyMessage.isOutgoing ? 'Вы' : 'Собеседник'}
          </Text>
          <Text 
            style={[
              styles.replyText,
              isOutgoing ? styles.replyTextOutgoing : styles.replyTextIncoming
            ]}
            numberOfLines={1}
          >
            {replyMessage.message_type !== 'text' ? '📷 Медиа' : replyMessage.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderMediaContent = () => {
    if (message.message_type === 'image') {
      const imageUri = message.content.startsWith('data:') 
        ? message.content 
        : `data:image/jpeg;base64,${message.content}`;
      
      return (
        <TouchableOpacity 
          onPress={() => onImagePress?.(imageUri)}
          onLongPress={handleLongPress}
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

  const renderAutoDeleteBadge = () => {
    if (!message.auto_delete_seconds) return null;
    
    let label = '';
    if (message.auto_delete_seconds <= 60) label = '1м';
    else if (message.auto_delete_seconds <= 3600) label = '1ч';
    else label = '24ч';
    
    return (
      <View style={styles.autoDeleteBadge}>
        <Ionicons name="timer-outline" size={10} color={isOutgoing ? 'rgba(255,255,255,0.7)' : '#666'} />
        <Text style={[styles.autoDeleteText, isOutgoing ? styles.autoDeleteTextOutgoing : styles.autoDeleteTextIncoming]}>
          {label}
        </Text>
      </View>
    );
  };
  
  const isMedia = message.message_type === 'image' || message.message_type === 'video';

  if (message.deleted) {
    return (
      <View style={[styles.container, isOutgoing ? styles.outgoing : styles.incoming]}>
        <View style={[styles.deletedBubble, isOutgoing ? styles.deletedBubbleOutgoing : styles.deletedBubbleIncoming]}>
          <Ionicons name="ban-outline" size={14} color="#8E8E93" />
          <Text style={styles.deletedText}>Сообщение удалено</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, isOutgoing ? styles.outgoing : styles.incoming]}>
      <Pressable 
        onLongPress={handleLongPress}
        style={[
          styles.bubble, 
          isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
          isMedia && styles.mediaBubble
        ]}
      >
        {renderReplyPreview()}
        
        {isMedia ? (
          <>
            {renderMediaContent()}
            <View style={[styles.mediaFooter, isOutgoing ? styles.outgoingMediaFooter : styles.incomingMediaFooter]}>
              {renderAutoDeleteBadge()}
              <Text style={[styles.time, isOutgoing ? styles.outgoingTime : styles.incomingTime]}>
                {message.edited && 'изм. '}
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
              {renderAutoDeleteBadge()}
              <Text style={[styles.time, isOutgoing ? styles.outgoingTime : styles.incomingTime]}>
                {message.edited && 'изм. '}
                {formatTime(message.timestamp)}
              </Text>
              {isOutgoing && <View style={styles.statusIcon}>{getStatusIcon()}</View>}
            </View>
          </>
        )}
      </Pressable>

      {/* Actions Menu */}
      {showActions && (
        <TouchableOpacity 
          style={styles.actionsOverlay}
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          <View style={[styles.actionsMenu, isOutgoing ? styles.actionsMenuRight : styles.actionsMenuLeft]}>
            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActions(false); onReply?.(message); }}>
              <Ionicons name="arrow-undo" size={20} color="#007AFF" />
              <Text style={styles.actionText}>Ответить</Text>
            </TouchableOpacity>
            
            {isOutgoing && message.message_type === 'text' && (
              <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActions(false); onEdit?.(message); }}>
                <Ionicons name="pencil" size={20} color="#007AFF" />
                <Text style={styles.actionText}>Редактировать</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.actionItem} onPress={handleDeletePress}>
              <Ionicons name="trash" size={20} color="#FF3B30" />
              <Text style={[styles.actionText, { color: '#FF3B30' }]}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
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
  deletedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 6,
  },
  deletedBubbleOutgoing: {
    backgroundColor: 'rgba(0,122,255,0.3)',
    borderBottomRightRadius: 4,
  },
  deletedBubbleIncoming: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderBottomLeftRadius: 4,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#8E8E93',
  },
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 6,
    paddingRight: 10,
    borderRadius: 8,
  },
  replyPreviewOutgoing: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  replyPreviewIncoming: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  replyBarOutgoing: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  replyBarIncoming: {
    backgroundColor: '#007AFF',
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyNameOutgoing: {
    color: 'rgba(255,255,255,0.9)',
  },
  replyNameIncoming: {
    color: '#007AFF',
  },
  replyText: {
    fontSize: 13,
  },
  replyTextOutgoing: {
    color: 'rgba(255,255,255,0.8)',
  },
  replyTextIncoming: {
    color: '#666',
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
    gap: 4,
  },
  mediaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
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
    marginLeft: 2,
  },
  autoDeleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  autoDeleteText: {
    fontSize: 10,
  },
  autoDeleteTextOutgoing: {
    color: 'rgba(255,255,255,0.7)',
  },
  autoDeleteTextIncoming: {
    color: '#666',
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
  actionsOverlay: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  actionsMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionsMenuRight: {
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  actionsMenuLeft: {
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  actionText: {
    fontSize: 15,
    color: '#000',
  },
});
