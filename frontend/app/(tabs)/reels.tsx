import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ViewToken,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { videosApi } from '../../src/services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const VIDEO_HEIGHT = screenHeight - 170; // Account for tab bar and status bar

const COLORS = {
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  primary: '#6C5CE7',
  success: '#00D9A5',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
};

interface VideoItem {
  id: string;
  user_id: string;
  username: string;
  description: string;
  privacy: string;
  video_url: string;
  likes_count: number;
  comments_count: number;
  views: number;
  is_liked: boolean;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

function VideoCard({ 
  item, 
  isActive, 
  onLike, 
  onComment,
  onShare 
}: { 
  item: VideoItem; 
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const heartScale = useRef(new Animated.Value(0)).current;
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
      setIsPlaying(true);
    } else {
      videoRef.current?.pauseAsync();
      setIsPlaying(false);
    }
  }, [isActive]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap - like
      if (!item.is_liked) {
        onLike();
      }
      // Show heart animation
      setShowHeart(true);
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.timing(heartScale, {
          toValue: 0,
          duration: 200,
          delay: 500,
          useNativeDriver: true,
        }),
      ]).start(() => setShowHeart(false));
    }
    lastTap.current = now;
  };

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      if (status.didJustFinish) {
        videoRef.current?.replayAsync();
      }
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      onPress={handleDoubleTap}
      style={styles.videoContainer}
    >
      <Video
        ref={videoRef}
        source={{ uri: item.video_url }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={isActive}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* Double tap heart animation */}
      {showHeart && (
        <Animated.View style={[styles.heartAnimation, { transform: [{ scale: heartScale }] }]}>
          <Ionicons name="heart" size={100} color={COLORS.error} />
        </Animated.View>
      )}

      {/* Play/Pause indicator */}
      {!isPlaying && !isLoading && (
        <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
          <Ionicons name="play" size={60} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      )}

      {/* Right side actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Ionicons 
            name={item.is_liked ? "heart" : "heart-outline"} 
            size={32} 
            color={item.is_liked ? COLORS.error : COLORS.text} 
          />
          <Text style={styles.actionText}>{formatCount(item.likes_count)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={30} color={COLORS.text} />
          <Text style={styles.actionText}>{formatCount(item.comments_count)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Ionicons name="paper-plane-outline" size={28} color={COLORS.text} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <View style={styles.actionButton}>
          <Ionicons name="eye-outline" size={26} color={COLORS.text} />
          <Text style={styles.actionText}>{formatCount(item.views)}</Text>
        </View>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>@{item.username}</Text>
          <View style={styles.privacyBadge}>
            <Ionicons 
              name={item.privacy === 'public' ? 'globe-outline' : item.privacy === 'contacts' ? 'people-outline' : 'lock-closed-outline'} 
              size={12} 
              color={COLORS.textSecondary} 
            />
          </View>
        </View>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

export default function ReelsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const loadVideos = async (refresh = false) => {
    if (!user) return;
    
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      
      const data = await videosApi.getFeed(user.id, 0, 20);
      setVideos(data);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [user]);

  const handleLike = async (videoId: string) => {
    if (!user) return;
    
    try {
      const result = await videosApi.likeVideo(videoId, user.id);
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, is_liked: result.action === 'liked', likes_count: result.likes_count }
          : v
      ));
    } catch (error) {
      console.error('Failed to like video:', error);
    }
  };

  const openComments = async (video: VideoItem) => {
    setSelectedVideo(video);
    setShowComments(true);
    setLoadingComments(true);
    
    try {
      const data = await videosApi.getComments(video.id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!user || !selectedVideo || !newComment.trim()) return;
    
    try {
      const comment = await videosApi.addComment(selectedVideo.id, user.id, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
      
      // Update comment count
      setVideos(prev => prev.map(v =>
        v.id === selectedVideo.id
          ? { ...v, comments_count: v.comments_count + 1 }
          : v
      ));
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Войдите, чтобы смотреть видео</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Лента</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/record-video' as any)}
        >
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Пока нет видео</Text>
          <Text style={styles.emptySubtext}>Будьте первым!</Text>
          <TouchableOpacity 
            style={styles.recordButton}
            onPress={() => router.push('/record-video' as any)}
          >
            <Ionicons name="videocam" size={24} color={COLORS.text} />
            <Text style={styles.recordButtonText}>Записать видео</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={({ item, index }) => (
            <VideoCard
              item={item}
              isActive={index === activeIndex}
              onLike={() => handleLike(item.id)}
              onComment={() => openComments(item)}
              onShare={() => {}}
            />
          )}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={VIDEO_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onRefresh={() => loadVideos(true)}
          refreshing={isRefreshing}
          getItemLayout={(_, index) => ({
            length: VIDEO_HEIGHT,
            offset: VIDEO_HEIGHT * index,
            index,
          })}
        />
      )}

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComments(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.commentsModal}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setShowComments(false)}
          />
          <View style={styles.commentsContainer}>
            <View style={styles.commentsHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.commentsTitle}>
                {selectedVideo?.comments_count || 0} комментариев
              </Text>
            </View>

            {loadingComments ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>Пока нет комментариев</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {item.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUsername}>@{item.username}</Text>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                style={styles.commentsList}
              />
            )}

            <View style={styles.commentInput}>
              <TextInput
                style={styles.input}
                placeholder="Добавить комментарий..."
                placeholderTextColor={COLORS.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                onPress={submitComment}
                disabled={!newComment.trim()}
              >
                <Ionicons name="send" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text,
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 24,
    gap: 8,
  },
  recordButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    width: screenWidth,
    height: VIDEO_HEIGHT,
    backgroundColor: COLORS.background,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heartAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -30,
    marginTop: -30,
  },
  actionsContainer: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 2,
  },
  bottomInfo: {
    position: 'absolute',
    left: 12,
    right: 70,
    bottom: 30,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  privacyBadge: {
    marginLeft: 8,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  description: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  commentsModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
  },
  commentsContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.6,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  commentsHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 2,
    marginBottom: 8,
  },
  commentsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  commentsList: {
    maxHeight: screenHeight * 0.4,
    paddingHorizontal: 16,
  },
  noComments: {
    padding: 40,
    alignItems: 'center',
  },
  noCommentsText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  commentText: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 2,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
});
