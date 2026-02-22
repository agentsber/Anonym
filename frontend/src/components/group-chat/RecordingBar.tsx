import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './colors';
import { RecordingBarProps } from './types';

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const RecordingBar: React.FC<RecordingBarProps> = ({ 
  duration, 
  onCancel, 
  onStop 
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Ionicons name="trash" size={24} color={COLORS.error} />
      </TouchableOpacity>
      <View style={styles.info}>
        <View style={styles.recordingDot} />
        <Text style={styles.time}>{formatDuration(duration)}</Text>
        <Text style={styles.text}>Запись...</Text>
      </View>
      <TouchableOpacity style={styles.stopButton} onPress={onStop}>
        <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
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
  cancelButton: {
    padding: 8,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  stopButton: {
    padding: 4,
  },
});

export default RecordingBar;
