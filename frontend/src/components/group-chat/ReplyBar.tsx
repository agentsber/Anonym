import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './colors';
import { ReplyBarProps } from './types';

export const ReplyBar: React.FC<ReplyBarProps> = ({ replyTo, onCancel }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{replyTo.sender_username}</Text>
        <Text style={styles.text} numberOfLines={1}>{replyTo.content}</Text>
      </View>
      <TouchableOpacity onPress={onCancel}>
        <Ionicons name="close" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  text: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

export default ReplyBar;
