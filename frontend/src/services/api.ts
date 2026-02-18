import axios from 'axios';
import Constants from 'expo-constants';
import { User, Message } from '../types';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'https://secure-messenger-149.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  register: async (data: {
    username: string;
    public_key: string;
    identity_key: string;
    signed_prekey: string;
    prekey_signature: string;
  }): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (username: string): Promise<User> => {
    const response = await api.post('/auth/login', { username });
    return response.data;
  },

  checkUsername: async (username: string): Promise<boolean> => {
    const response = await api.get(`/auth/check-username/${username}`);
    return response.data.available;
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

export default api;
