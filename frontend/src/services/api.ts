import axios from 'axios';
import Constants from 'expo-constants';
import { User, Message } from '../types';

// Production backend URL - CHANGE THIS BEFORE BUILDING APK
const PRODUCTION_BACKEND_URL = 'https://private-social-18.preview.emergentagent.com';

// Get API URL from environment or use production URL
const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                PRODUCTION_BACKEND_URL;

console.log('API URL:', API_URL);

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const authApi = {
  register: async (data: {
    username: string;
    email: string;
    password: string;
    public_key: string;
    identity_key: string;
    signed_prekey: string;
    prekey_signature: string;
  }): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string): Promise<User> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  checkUsername: async (username: string): Promise<boolean> => {
    const response = await api.get(`/auth/check-username/${username}`);
    return response.data.available;
  },

  checkEmail: async (email: string): Promise<boolean> => {
    try {
      const response = await api.get(`/auth/check-email/${email}`);
      return response.data.available;
    } catch {
      return true; // Assume available if endpoint doesn't exist
    }
  },
};

export const usersApi = {
  search: async (username: string): Promise<User | null> => {
    const response = await api.get('/users/search', { params: { username } });
    return response.data;
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  getStatus: async (userId: string): Promise<{ online: boolean; last_seen: string | null }> => {
    const response = await api.get(`/users/${userId}/status`);
    return response.data;
  },

  getProfile: async (userId: string): Promise<any> => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  updateProfile: async (userId: string, data: {
    username?: string;
    display_name?: string;
    bio?: string;
    birthday?: string;
    avatar_url?: string;
  }): Promise<any> => {
    const response = await api.put(`/users/${userId}/profile`, data);
    return response.data;
  },

  checkUsername: async (username: string): Promise<{ available: boolean }> => {
    const response = await api.get(`/users/check-username/${username}`);
    return response.data;
  },
};

export const messagesApi = {
  send: async (data: {
    sender_id: string;
    receiver_id: string;
    encrypted_content: string;
    ephemeral_key: string;
    message_type: string;
    reply_to_id?: string;
    auto_delete_seconds?: number;
  }) => {
    const response = await api.post('/messages/send', data);
    return response.data;
  },

  getPending: async (userId: string) => {
    const response = await api.get(`/messages/pending/${userId}`);
    return response.data;
  },

  markDelivered: async (messageId: string) => {
    const response = await api.post(`/messages/${messageId}/delivered`);
    return response.data;
  },

  markRead: async (messageId: string, readerId: string) => {
    const response = await api.post(`/messages/${messageId}/read`, null, {
      params: { reader_id: readerId },
    });
    return response.data;
  },

  edit: async (messageId: string, senderId: string, data: {
    encrypted_content: string;
    ephemeral_key: string;
  }) => {
    const response = await api.put(`/messages/${messageId}/edit`, data, {
      params: { sender_id: senderId },
    });
    return response.data;
  },

  delete: async (messageId: string, senderId: string, forEveryone: boolean = false) => {
    const response = await api.delete(`/messages/${messageId}`, {
      params: { sender_id: senderId, for_everyone: forEveryone },
    });
    return response.data;
  },
};

export const mediaApi = {
  upload: async (data: {
    sender_id: string;
    receiver_id: string;
    encrypted_data: string;
    ephemeral_key: string;
    media_type: string;
    file_name: string;
  }) => {
    const formData = new FormData();
    formData.append('sender_id', data.sender_id);
    formData.append('receiver_id', data.receiver_id);
    formData.append('encrypted_data', data.encrypted_data);
    formData.append('ephemeral_key', data.ephemeral_key);
    formData.append('media_type', data.media_type);
    formData.append('file_name', data.file_name);
    
    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  get: async (mediaId: string) => {
    const response = await api.get(`/media/${mediaId}`);
    return response.data;
  },

  markDelivered: async (mediaId: string) => {
    const response = await api.post(`/media/${mediaId}/delivered`);
    return response.data;
  },
};

export const contactsApi = {
  add: async (userId: string, contactId: string) => {
    const response = await api.post('/contacts/add', null, {
      params: { user_id: userId, contact_id: contactId },
    });
    return response.data;
  },

  getAll: async (userId: string): Promise<User[]> => {
    const response = await api.get(`/contacts/${userId}`);
    return response.data;
  },
};

// Groups API
export const groupsApi = {
  create: async (data: { name: string; creator_id: string; member_ids: string[] }) => {
    const response = await api.post('/groups', data);
    return response.data;
  },

  getUserGroups: async (userId: string) => {
    const response = await api.get(`/groups/${userId}`);
    return response.data;
  },

  getGroupInfo: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/info`);
    return response.data;
  },

  updateGroup: async (groupId: string, data: { name?: string }, userId: string) => {
    const response = await api.put(`/groups/${groupId}`, data, { params: { user_id: userId } });
    return response.data;
  },

  addMember: async (groupId: string, memberId: string, adminId: string) => {
    const response = await api.post(`/groups/${groupId}/members/${memberId}`, null, { params: { admin_id: adminId } });
    return response.data;
  },

  removeMember: async (groupId: string, memberId: string, adminId: string) => {
    const response = await api.delete(`/groups/${groupId}/members/${memberId}`, { params: { admin_id: adminId } });
    return response.data;
  },

  sendMessage: async (groupId: string, data: { sender_id: string; content: string; message_type?: string; reply_to_id?: string; media_url?: string }) => {
    const response = await api.post(`/groups/${groupId}/messages`, { group_id: groupId, ...data });
    return response.data;
  },

  getMessages: async (groupId: string, limit?: number, before?: string, search?: string) => {
    const response = await api.get(`/groups/${groupId}/messages`, { params: { limit, before, search } });
    return response.data;
  },

  deleteGroup: async (groupId: string, userId: string) => {
    const response = await api.delete(`/groups/${groupId}`, { params: { user_id: userId } });
    return response.data;
  },

  // Edit message
  editMessage: async (groupId: string, messageId: string, content: string, userId: string) => {
    const response = await api.put(`/groups/${groupId}/messages/${messageId}`, { content }, { params: { user_id: userId } });
    return response.data;
  },

  // Delete message
  deleteMessage: async (groupId: string, messageId: string, userId: string) => {
    const response = await api.delete(`/groups/${groupId}/messages/${messageId}`, { params: { user_id: userId } });
    return response.data;
  },

  // Pin/Unpin message
  pinMessage: async (groupId: string, messageId: string, userId: string) => {
    const response = await api.post(`/groups/${groupId}/messages/${messageId}/pin`, null, { params: { user_id: userId } });
    return response.data;
  },

  unpinMessage: async (groupId: string, messageId: string, userId: string) => {
    const response = await api.delete(`/groups/${groupId}/messages/${messageId}/pin`, { params: { user_id: userId } });
    return response.data;
  },

  getPinnedMessages: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/pinned`);
    return response.data;
  },

  // Update member role
  updateMemberRole: async (groupId: string, memberId: string, role: string, adminId: string) => {
    const response = await api.put(`/groups/${groupId}/members/${memberId}/role`, { role }, { params: { admin_id: adminId } });
    return response.data;
  },

  // Ban management
  banMember: async (groupId: string, memberId: string, adminId: string, reason?: string) => {
    const response = await api.post(`/groups/${groupId}/ban/${memberId}`, { reason }, { params: { admin_id: adminId } });
    return response.data;
  },

  unbanMember: async (groupId: string, memberId: string, adminId: string) => {
    const response = await api.delete(`/groups/${groupId}/ban/${memberId}`, { params: { admin_id: adminId } });
    return response.data;
  },

  getBannedMembers: async (groupId: string, adminId: string) => {
    const response = await api.get(`/groups/${groupId}/bans`, { params: { admin_id: adminId } });
    return response.data;
  },

  // Search messages
  searchMessages: async (groupId: string, query: string, limit?: number) => {
    const response = await api.get(`/groups/${groupId}/search`, { params: { q: query, limit } });
    return response.data;
  },
};

// Forward API
export const forwardApi = {
  getTargets: async (userId: string) => {
    const response = await api.get(`/forward/targets/${userId}`);
    return response.data;
  },

  forwardMessage: async (data: {
    sender_id: string;
    original_message_id: string;
    original_message_type: 'direct' | 'group';
    target_type: 'user' | 'group';
    target_id: string;
    encrypted_content?: string;
    ephemeral_key?: string;
  }) => {
    const response = await api.post('/messages/forward', data);
    return response.data;
  },
};

// Stickers API
export const stickersApi = {
  getPacks: async () => {
    const response = await api.get('/stickers/packs');
    return response.data;
  },

  getPack: async (packId: string) => {
    const response = await api.get(`/stickers/packs/${packId}`);
    return response.data;
  },
};

// Voice Messages API
export const voiceApi = {
  upload: async (formData: FormData) => {
    const response = await api.post('/upload/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getUrl: (fileId: string) => {
    return `${API_URL}/api/voice/${fileId}`;
  },
};

export default api;

// Video Calls API
export const callsApi = {
  initiateCall: async (data: {
    caller_id: string;
    callee_id: string;
    offer: string;
    call_type: 'video' | 'audio';
  }) => {
    const response = await api.post('/calls/initiate', data);
    return response.data;
  },

  answerCall: async (data: { call_id: string; answer: string }) => {
    const response = await api.post('/calls/answer', data);
    return response.data;
  },

  sendIceCandidate: async (data: {
    call_id: string;
    user_id: string;
    candidate: string;
  }) => {
    const response = await api.post('/calls/ice-candidate', data);
    return response.data;
  },

  callAction: async (data: {
    call_id: string;
    user_id: string;
    action: 'reject' | 'end' | 'toggle_video' | 'toggle_audio' | 'switch_camera';
  }) => {
    const response = await api.post('/calls/action', data);
    return response.data;
  },

  getCallHistory: async (userId: string, limit?: number) => {
    const response = await api.get(`/calls/history/${userId}`, { params: { limit } });
    return response.data;
  },

  getActiveCall: async (userId: string) => {
    const response = await api.get(`/calls/active/${userId}`);
    return response.data;
  },
};

// Video Feed (Reels) API
export const videosApi = {
  upload: async (data: {
    user_id: string;
    description: string;
    privacy: 'public' | 'contacts' | 'private';
    video_data: string;
    editor_metadata?: string | null;
  }) => {
    const response = await api.post('/videos/upload', data);
    return response.data;
  },

  getFeed: async (userId: string, skip: number = 0, limit: number = 10) => {
    const response = await api.get(`/videos/feed/${userId}`, { params: { skip, limit } });
    return response.data;
  },

  getVideo: async (videoId: string, userId?: string) => {
    const response = await api.get(`/videos/${videoId}`, { params: { user_id: userId } });
    return response.data;
  },

  getVideoUrl: (videoId: string) => {
    return `${API_URL}/api/videos/${videoId}/stream`;
  },

  likeVideo: async (videoId: string, userId: string) => {
    const response = await api.post(`/videos/${videoId}/like`, null, { params: { user_id: userId } });
    return response.data;
  },

  addComment: async (videoId: string, userId: string, content: string) => {
    const response = await api.post(`/videos/${videoId}/comment`, { user_id: userId, content });
    return response.data;
  },

  getComments: async (videoId: string, skip: number = 0, limit: number = 50) => {
    const response = await api.get(`/videos/${videoId}/comments`, { params: { skip, limit } });
    return response.data;
  },

  deleteVideo: async (videoId: string, userId: string) => {
    const response = await api.delete(`/videos/${videoId}`, { params: { user_id: userId } });
    return response.data;
  },

  getUserVideos: async (targetUserId: string, viewerId?: string, skip: number = 0, limit: number = 20) => {
    const response = await api.get(`/videos/user/${targetUserId}`, { 
      params: { viewer_id: viewerId, skip, limit } 
    });
    return response.data;
  },
};
