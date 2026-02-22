import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './colors';
import { EditBarProps } from './types';

export const EditBar: React.FC<EditBarProps> = ({ 
  editText, 
  onChangeText, 
  onSave, 
  onCancel 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Редактирование</Text>
        <TextInput
          style={styles.input}
          value={editText}
          onChangeText={onChangeText}
          autoFocus
        />
      </View>
      <TouchableOpacity onPress={onCancel}>
        <Ionicons name="close" size={20} color={COLORS.error} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onSave} style={{ marginLeft: 12 }}>
        <Ionicons name="checkmark" size={24} color={COLORS.success} />
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
  label: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  input: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: 4,
  },
});

export default EditBar;
