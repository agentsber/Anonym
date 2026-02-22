import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from './colors';
import { StickerPanelProps } from './types';

export const StickerPanel: React.FC<StickerPanelProps> = ({
  stickerPacks,
  activePackIndex,
  onSelectPack,
  onSelectSticker,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabs}
      >
        {stickerPacks.map((pack, index) => (
          <TouchableOpacity
            key={pack.id}
            style={[
              styles.tab, 
              activePackIndex === index && styles.tabActive
            ]}
            onPress={() => onSelectPack(index)}
          >
            <Text style={styles.tabText}>{pack.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.grid}>
        {stickerPacks[activePackIndex]?.stickers.map((sticker, index) => (
          <TouchableOpacity
            key={index}
            style={styles.stickerItem}
            onPress={() => onSelectSticker(sticker)}
          >
            <Text style={styles.stickerEmoji}>{sticker}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    maxHeight: 250,
  },
  tabs: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  stickerItem: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: {
    fontSize: 28,
  },
});

export default StickerPanel;
