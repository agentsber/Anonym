import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './colors';
import { InputToolbarProps } from './types';

export const InputToolbar: React.FC<InputToolbarProps> = ({
  inputText,
  isSending,
  showStickers,
  onChangeText,
  onSend,
  onPickImage,
  onToggleStickers,
  onStartRecording,
}) => {
  const hasText = inputText.trim().length > 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.attachButton} onPress={onPickImage}>
        <Ionicons name="image" size={24} color={COLORS.primary} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.attachButton} onPress={onToggleStickers}>
        <Ionicons 
          name="happy" 
          size={24} 
          color={showStickers ? COLORS.warning : COLORS.primary} 
        />
      </TouchableOpacity>
      
      <TextInput
        style={styles.input}
        placeholder="Сообщение..."
        placeholderTextColor={COLORS.textSecondary}
        value={inputText}
        onChangeText={onChangeText}
        multiline
      />
      
      {hasText ? (
        <TouchableOpacity 
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.voiceButton} onPress={onStartRecording}>
          <Ionicons name="mic" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  voiceButton: {
    padding: 8,
  },
});

export default InputToolbar;
