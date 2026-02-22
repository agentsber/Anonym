import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './colors';
import { MessageMenuProps } from './types';

export const MessageMenu: React.FC<MessageMenuProps> = ({
  visible,
  message,
  currentUserId,
  isAdmin,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
}) => {
  const isOwnMessage = message?.sender_id === currentUserId;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={onReply}>
            <Ionicons name="arrow-undo" size={20} color={COLORS.text} />
            <Text style={styles.menuText}>Ответить</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={onForward}>
            <Ionicons name="arrow-redo" size={20} color={COLORS.primary} />
            <Text style={styles.menuText}>Переслать</Text>
          </TouchableOpacity>
          
          {isOwnMessage && (
            <TouchableOpacity style={styles.menuItem} onPress={onEdit}>
              <Ionicons name="pencil" size={20} color={COLORS.text} />
              <Text style={styles.menuText}>Редактировать</Text>
            </TouchableOpacity>
          )}
          
          {isAdmin && (
            <TouchableOpacity style={styles.menuItem} onPress={onPin}>
              <Ionicons 
                name={message?.is_pinned ? "pin-outline" : "pin"} 
                size={20} 
                color={COLORS.warning} 
              />
              <Text style={styles.menuText}>
                {message?.is_pinned ? 'Открепить' : 'Закрепить'}
              </Text>
            </TouchableOpacity>
          )}
          
          {(isOwnMessage || isAdmin) && (
            <TouchableOpacity style={styles.menuItem} onPress={onDelete}>
              <Ionicons name="trash" size={20} color={COLORS.error} />
              <Text style={[styles.menuText, { color: COLORS.error }]}>
                Удалить
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    color: COLORS.text,
  },
});

export default MessageMenu;
