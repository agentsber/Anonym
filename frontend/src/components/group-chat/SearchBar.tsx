import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './colors';
import { SearchBarProps } from './types';

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  results,
  onChangeQuery,
  onSearch,
  onSelectResult,
}) => {
  return (
    <View>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Поиск сообщений..."
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={onSearch}
        />
        <TouchableOpacity onPress={onSearch}>
          <Ionicons name="search" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      {results.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Результаты ({results.length})</Text>
          {results.slice(0, 5).map(msg => (
            <TouchableOpacity 
              key={msg.id} 
              style={styles.resultItem}
              onPress={() => onSelectResult(msg)}
            >
              <Text style={styles.resultSender}>{msg.sender_username}</Text>
              <Text style={styles.resultContent} numberOfLines={1}>
                {msg.content}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  results: {
    backgroundColor: COLORS.surface,
    padding: 12,
  },
  resultsTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  resultItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultSender: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  resultContent: {
    fontSize: 14,
    color: COLORS.text,
  },
});

export default SearchBar;
