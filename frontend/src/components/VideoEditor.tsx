import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  PanResponder,
  Animated,
  FlatList,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = {
  background: '#000000',
  surface: '#1A1A1A',
  primary: '#6C5CE7',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
};

// Filter presets
export const VIDEO_FILTERS = {
  normal: { name: 'Обычный', brightness: 1, contrast: 1, saturation: 1, hue: 0 },
  vintage: { name: 'Винтаж', brightness: 0.9, contrast: 1.1, saturation: 0.7, hue: 20 },
  noir: { name: 'Нуар', brightness: 0.85, contrast: 1.3, saturation: 0, hue: 0 },
  warm: { name: 'Тёплый', brightness: 1.05, contrast: 1.05, saturation: 1.1, hue: 15 },
  cold: { name: 'Холодный', brightness: 1, contrast: 1.1, saturation: 0.9, hue: -15 },
  vivid: { name: 'Яркий', brightness: 1.1, contrast: 1.2, saturation: 1.4, hue: 0 },
  muted: { name: 'Приглушённый', brightness: 0.95, contrast: 0.9, saturation: 0.6, hue: 0 },
  sepia: { name: 'Сепия', brightness: 1, contrast: 1.1, saturation: 0.3, hue: 30 },
};

export type FilterKey = keyof typeof VIDEO_FILTERS;

// Stickers
export const STICKERS = [
  { id: '1', emoji: '❤️', name: 'heart' },
  { id: '2', emoji: '🔥', name: 'fire' },
  { id: '3', emoji: '😂', name: 'laugh' },
  { id: '4', emoji: '👍', name: 'thumbsup' },
  { id: '5', emoji: '🎉', name: 'party' },
  { id: '6', emoji: '✨', name: 'sparkles' },
  { id: '7', emoji: '💯', name: '100' },
  { id: '8', emoji: '🌟', name: 'star' },
  { id: '9', emoji: '💪', name: 'muscle' },
  { id: '10', emoji: '🎵', name: 'music' },
  { id: '11', emoji: '💕', name: 'hearts' },
  { id: '12', emoji: '😎', name: 'cool' },
  { id: '13', emoji: '🤩', name: 'starstruck' },
  { id: '14', emoji: '💫', name: 'dizzy' },
  { id: '15', emoji: '🙌', name: 'raised' },
];

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
}

interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

interface VideoEditorProps {
  videoUri: string;
  onSave: (editorData: EditorData) => void;
  onCancel: () => void;
}

export interface EditorData {
  filter: FilterKey;
  customFilter: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  trimStart: number;
  trimEnd: number;
  texts: TextOverlay[];
  stickers: StickerOverlay[];
  musicUri: string | null;
  musicVolume: number;
}

type EditorTab = 'filters' | 'adjust' | 'trim' | 'text' | 'stickers' | 'music';

export default function VideoEditor({ videoUri, onSave, onCancel }: VideoEditorProps) {
  const videoRef = useRef<Video>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('filters');
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('normal');
  const [customBrightness, setCustomBrightness] = useState(1);
  const [customContrast, setCustomContrast] = useState(1);
  const [customSaturation, setCustomSaturation] = useState(1);
  
  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  // Text overlays
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [editingText, setEditingText] = useState<TextOverlay | null>(null);
  const [newTextInput, setNewTextInput] = useState('');
  const [selectedTextColor, setSelectedTextColor] = useState('#FFFFFF');
  
  // Sticker overlays
  const [stickers, setStickers] = useState<StickerOverlay[]>([]);
  
  // Music state
  const [musicUri, setMusicUri] = useState<string | null>(null);
  const [musicName, setMusicName] = useState<string>('');
  const [musicVolume, setMusicVolume] = useState(0.5);

  useEffect(() => {
    if (duration > 0 && trimEnd === 0) {
      setTrimEnd(duration);
    }
  }, [duration]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setCurrentTime(status.positionMillis || 0);
      
      // Loop within trim range
      if (status.positionMillis && status.positionMillis >= trimEnd && trimEnd > 0) {
        videoRef.current?.setPositionAsync(trimStart);
      }
    }
  }, [trimStart, trimEnd]);

  const togglePlayback = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = async (position: number) => {
    await videoRef.current?.setPositionAsync(position);
  };

  const addText = () => {
    if (!newTextInput.trim()) return;
    
    const newText: TextOverlay = {
      id: Date.now().toString(),
      text: newTextInput.trim(),
      x: screenWidth / 2 - 50,
      y: 200,
      fontSize: 24,
      color: selectedTextColor,
      fontWeight: 'bold',
    };
    
    setTexts([...texts, newText]);
    setNewTextInput('');
  };

  const removeText = (id: string) => {
    setTexts(texts.filter(t => t.id !== id));
  };

  const addSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: Date.now().toString(),
      emoji,
      x: screenWidth / 2 - 25,
      y: 250,
      scale: 1,
    };
    setStickers([...stickers, newSticker]);
  };

  const removeSticker = (id: string) => {
    setStickers(stickers.filter(s => s.id !== id));
  };

  const handleSave = () => {
    const editorData: EditorData = {
      filter: selectedFilter,
      customFilter: {
        brightness: customBrightness,
        contrast: customContrast,
        saturation: customSaturation,
      },
      trimStart,
      trimEnd,
      texts,
      stickers,
      musicUri,
      musicVolume,
    };
    onSave(editorData);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilterStyle = () => {
    const filter = VIDEO_FILTERS[selectedFilter];
    return {
      opacity: customBrightness,
    };
  };

  const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  return (
    <View style={styles.container}>
      {/* Video Preview */}
      <View style={styles.videoContainer}>
        <TouchableOpacity activeOpacity={1} onPress={togglePlayback} style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={[styles.video, getFilterStyle()]}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay={isPlaying}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
          
          {/* Filter overlay effect */}
          {selectedFilter !== 'normal' && (
            <View style={[
              styles.filterOverlay,
              selectedFilter === 'vintage' && { backgroundColor: 'rgba(255, 200, 100, 0.15)' },
              selectedFilter === 'cold' && { backgroundColor: 'rgba(100, 150, 255, 0.15)' },
              selectedFilter === 'warm' && { backgroundColor: 'rgba(255, 150, 100, 0.15)' },
              selectedFilter === 'sepia' && { backgroundColor: 'rgba(180, 130, 70, 0.2)' },
              selectedFilter === 'noir' && { backgroundColor: 'rgba(0, 0, 0, 0.1)' },
            ]} />
          )}
          
          {/* Text overlays */}
          {texts.map(textItem => (
            <DraggableItem
              key={textItem.id}
              initialX={textItem.x}
              initialY={textItem.y}
              onPositionChange={(x, y) => {
                setTexts(texts.map(t => t.id === textItem.id ? { ...t, x, y } : t));
              }}
              onDelete={() => removeText(textItem.id)}
            >
              <Text style={[
                styles.overlayText,
                { 
                  fontSize: textItem.fontSize, 
                  color: textItem.color,
                  fontWeight: textItem.fontWeight,
                }
              ]}>
                {textItem.text}
              </Text>
            </DraggableItem>
          ))}
          
          {/* Sticker overlays */}
          {stickers.map(sticker => (
            <DraggableItem
              key={sticker.id}
              initialX={sticker.x}
              initialY={sticker.y}
              onPositionChange={(x, y) => {
                setStickers(stickers.map(s => s.id === sticker.id ? { ...s, x, y } : s));
              }}
              onDelete={() => removeSticker(sticker.id)}
            >
              <Text style={[styles.overlaySticker, { transform: [{ scale: sticker.scale }] }]}>
                {sticker.emoji}
              </Text>
            </DraggableItem>
          ))}
          
          {/* Play/Pause indicator */}
          {!isPlaying && (
            <View style={styles.playIndicator}>
              <Ionicons name="play" size={50} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Music indicator */}
        {musicUri && (
          <View style={styles.musicIndicator}>
            <Ionicons name="musical-notes" size={16} color={COLORS.primary} />
            <Text style={styles.musicName} numberOfLines={1}>{musicName}</Text>
          </View>
        )}
      </View>
      
      {/* Timeline */}
      <View style={styles.timeline}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Slider
          style={styles.timelineSlider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={seekTo}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.textSecondary}
          thumbTintColor={COLORS.primary}
        />
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'filters', icon: 'color-palette-outline', label: 'Фильтры' },
            { key: 'adjust', icon: 'options-outline', label: 'Настройки' },
            { key: 'trim', icon: 'cut-outline', label: 'Обрезка' },
            { key: 'text', icon: 'text-outline', label: 'Текст' },
            { key: 'stickers', icon: 'happy-outline', label: 'Стикеры' },
            { key: 'music', icon: 'musical-notes-outline', label: 'Музыка' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as EditorTab)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={activeTab === tab.key ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Tab Content */}
      <View style={styles.tabContent}>
        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {Object.entries(VIDEO_FILTERS).map(([key, filter]) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterItem, selectedFilter === key && styles.filterItemActive]}
                onPress={() => setSelectedFilter(key as FilterKey)}
              >
                <View style={[
                  styles.filterPreview,
                  key === 'vintage' && { backgroundColor: '#D4A574' },
                  key === 'noir' && { backgroundColor: '#444' },
                  key === 'warm' && { backgroundColor: '#FFB366' },
                  key === 'cold' && { backgroundColor: '#66B3FF' },
                  key === 'vivid' && { backgroundColor: '#FF66B2' },
                  key === 'muted' && { backgroundColor: '#999' },
                  key === 'sepia' && { backgroundColor: '#B5835A' },
                  key === 'normal' && { backgroundColor: COLORS.surface },
                ]} />
                <Text style={styles.filterName}>{filter.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        {/* Adjust Tab */}
        {activeTab === 'adjust' && (
          <View style={styles.adjustContainer}>
            <View style={styles.adjustItem}>
              <Text style={styles.adjustLabel}>Яркость</Text>
              <Slider
                style={styles.adjustSlider}
                minimumValue={0.5}
                maximumValue={1.5}
                value={customBrightness}
                onValueChange={setCustomBrightness}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.textSecondary}
                thumbTintColor={COLORS.primary}
              />
              <Text style={styles.adjustValue}>{Math.round(customBrightness * 100)}%</Text>
            </View>
            <View style={styles.adjustItem}>
              <Text style={styles.adjustLabel}>Контраст</Text>
              <Slider
                style={styles.adjustSlider}
                minimumValue={0.5}
                maximumValue={1.5}
                value={customContrast}
                onValueChange={setCustomContrast}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.textSecondary}
                thumbTintColor={COLORS.primary}
              />
              <Text style={styles.adjustValue}>{Math.round(customContrast * 100)}%</Text>
            </View>
            <View style={styles.adjustItem}>
              <Text style={styles.adjustLabel}>Насыщенность</Text>
              <Slider
                style={styles.adjustSlider}
                minimumValue={0}
                maximumValue={2}
                value={customSaturation}
                onValueChange={setCustomSaturation}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.textSecondary}
                thumbTintColor={COLORS.primary}
              />
              <Text style={styles.adjustValue}>{Math.round(customSaturation * 100)}%</Text>
            </View>
          </View>
        )}
        
        {/* Trim Tab */}
        {activeTab === 'trim' && (
          <View style={styles.trimContainer}>
            <Text style={styles.trimTitle}>Обрезать видео</Text>
            <View style={styles.trimSliders}>
              <View style={styles.trimItem}>
                <Text style={styles.trimLabel}>Начало: {formatTime(trimStart)}</Text>
                <Slider
                  style={styles.trimSlider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={trimStart}
                  onValueChange={(val) => {
                    if (val < trimEnd - 1000) setTrimStart(val);
                  }}
                  minimumTrackTintColor={COLORS.textSecondary}
                  maximumTrackTintColor={COLORS.primary}
                  thumbTintColor={COLORS.success}
                />
              </View>
              <View style={styles.trimItem}>
                <Text style={styles.trimLabel}>Конец: {formatTime(trimEnd)}</Text>
                <Slider
                  style={styles.trimSlider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={trimEnd}
                  onValueChange={(val) => {
                    if (val > trimStart + 1000) setTrimEnd(val);
                  }}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.textSecondary}
                  thumbTintColor={COLORS.error}
                />
              </View>
            </View>
            <Text style={styles.trimDuration}>
              Длительность: {formatTime(trimEnd - trimStart)}
            </Text>
          </View>
        )}
        
        {/* Text Tab */}
        {activeTab === 'text' && (
          <View style={styles.textContainer}>
            <View style={styles.textInputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Введите текст..."
                placeholderTextColor={COLORS.textSecondary}
                value={newTextInput}
                onChangeText={setNewTextInput}
              />
              <TouchableOpacity style={styles.addTextButton} onPress={addText}>
                <Ionicons name="add" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.colorPicker}>
              {TEXT_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedTextColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedTextColor(color)}
                />
              ))}
            </View>
            {texts.length > 0 && (
              <View style={styles.textsList}>
                <Text style={styles.textsTitle}>Добавленный текст:</Text>
                {texts.map(t => (
                  <View key={t.id} style={styles.textItem}>
                    <Text style={[styles.textItemText, { color: t.color }]}>{t.text}</Text>
                    <TouchableOpacity onPress={() => removeText(t.id)}>
                      <Ionicons name="close-circle" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        
        {/* Stickers Tab */}
        {activeTab === 'stickers' && (
          <View style={styles.stickersContainer}>
            <FlatList
              data={STICKERS}
              numColumns={5}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stickerItem}
                  onPress={() => addSticker(item.emoji)}
                >
                  <Text style={styles.stickerEmoji}>{item.emoji}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
        
        {/* Music Tab */}
        {activeTab === 'music' && (
          <View style={styles.musicContainer}>
            <TouchableOpacity 
              style={styles.selectMusicButton}
              onPress={() => {
                // Will be handled by parent component
              }}
            >
              <Ionicons name="folder-open-outline" size={24} color={COLORS.text} />
              <Text style={styles.selectMusicText}>
                {musicUri ? 'Сменить музыку' : 'Выбрать музыку'}
              </Text>
            </TouchableOpacity>
            
            {musicUri && (
              <>
                <View style={styles.selectedMusic}>
                  <Ionicons name="musical-notes" size={20} color={COLORS.primary} />
                  <Text style={styles.selectedMusicName} numberOfLines={1}>{musicName}</Text>
                  <TouchableOpacity onPress={() => { setMusicUri(null); setMusicName(''); }}>
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.volumeControl}>
                  <Ionicons name="volume-low" size={20} color={COLORS.textSecondary} />
                  <Slider
                    style={styles.volumeSlider}
                    minimumValue={0}
                    maximumValue={1}
                    value={musicVolume}
                    onValueChange={setMusicVolume}
                    minimumTrackTintColor={COLORS.primary}
                    maximumTrackTintColor={COLORS.textSecondary}
                    thumbTintColor={COLORS.primary}
                  />
                  <Ionicons name="volume-high" size={20} color={COLORS.textSecondary} />
                </View>
              </>
            )}
            
            <Text style={styles.musicHint}>
              Выберите аудиофайл с устройства для добавления к видео
            </Text>
          </View>
        )}
      </View>
      
      {/* Bottom buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Отмена</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={24} color={COLORS.text} />
          <Text style={styles.saveText}>Готово</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Draggable component for text and stickers
interface DraggableItemProps {
  initialX: number;
  initialY: number;
  onPositionChange: (x: number, y: number) => void;
  onDelete: () => void;
  children: React.ReactNode;
}

function DraggableItem({ initialX, initialY, onPositionChange, onDelete, children }: DraggableItemProps) {
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const [showDelete, setShowDelete] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setShowDelete(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        onPositionChange(gesture.moveX - 50, gesture.moveY - 100);
        setTimeout(() => setShowDelete(false), 2000);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.draggableItem, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      {children}
      {showDelete && (
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="close-circle" size={20} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  videoContainer: {
    height: 350,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  playIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 6,
  },
  musicName: {
    color: COLORS.text,
    fontSize: 12,
    maxWidth: 150,
  },
  overlayText: {
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  overlaySticker: {
    fontSize: 50,
  },
  draggableItem: {
    position: 'absolute',
  },
  deleteButton: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
  },
  timelineSlider: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    width: 40,
  },
  tabsContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  activeTabLabel: {
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  filterItemActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
  },
  filterPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 6,
  },
  filterName: {
    color: COLORS.text,
    fontSize: 12,
  },
  adjustContainer: {
    gap: 20,
  },
  adjustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustLabel: {
    color: COLORS.text,
    fontSize: 14,
    width: 100,
  },
  adjustSlider: {
    flex: 1,
  },
  adjustValue: {
    color: COLORS.textSecondary,
    fontSize: 12,
    width: 45,
    textAlign: 'right',
  },
  trimContainer: {
    gap: 16,
  },
  trimTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  trimSliders: {
    gap: 16,
  },
  trimItem: {},
  trimLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  trimSlider: {
    width: '100%',
  },
  trimDuration: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  textContainer: {
    gap: 16,
  },
  textInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  addTextButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 10,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: COLORS.primary,
  },
  textsList: {
    gap: 8,
  },
  textsTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  textItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
  },
  textItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stickersContainer: {
    flex: 1,
  },
  stickerItem: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  stickerEmoji: {
    fontSize: 36,
  },
  musicContainer: {
    gap: 16,
  },
  selectMusicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  selectMusicText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  selectedMusic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  selectedMusicName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumeSlider: {
    flex: 1,
  },
  musicHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: COLORS.surface,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
