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
};

export const messagesApi = {
  send: async (data: {
    sender_id: string;
    receiver_id: string;
    encrypted_content: string;
    ephemeral_key: string;
    message_type: string;
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
