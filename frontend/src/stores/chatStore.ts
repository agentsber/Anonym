import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Message } from '../types';
import { messagesApi, contactsApi, mediaApi } from '../services/api';
import { encryptMessage, decryptMessage, generateRandomId } from '../services/crypto';

const STORAGE_KEYS = {
  MESSAGES: 'secure_messenger_messages',
  CONTACTS: 'secure_messenger_contacts',
};

interface ChatState {
  contacts: User[];
  chats: Map<string, Message[]>;
  unreadCounts: Map<string, number>;
  currentChat: string | null;
  isLoading: boolean;
  error: string | null;
  
  loadContacts: (userId: string) => Promise<void>;
  addContact: (userId: string, contact: User) => Promise<void>;
  sendMessage: (
    senderId: string,
    receiverId: string,
    content: string,
    senderSecretKey: string,
    receiverPublicKey: string,
    messageType?: 'text' | 'image' | 'video',
    replyToId?: string,
    autoDeleteSeconds?: number
  ) => Promise<void>;
  sendMedia: (
    senderId: string,
    receiverId: string,
    mediaBase64: string,
    senderSecretKey: string,
    receiverPublicKey: string,
    mediaType: 'image' | 'video' | 'audio',
    fileName: string
  ) => Promise<void>;
  fetchPendingMessages: (userId: string, secretKey: string) => Promise<void>;
  setCurrentChat: (contactId: string | null) => void;
  getMessages: (contactId: string) => Message[];
  getUnreadCount: (contactId: string) => number;
  markAsRead: (contactId: string) => void;
  loadLocalMessages: (userId: string) => Promise<void>;
  saveLocalMessages: (userId: string) => Promise<void>;
  updateMessage: (contactId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (contactId: string, messageId: string) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  contacts: [],
  chats: new Map(),
  unreadCounts: new Map(),
  currentChat: null,
  isLoading: false,
  error: null,

  loadContacts: async (userId: string) => {
    try {
      set({ isLoading: true });
      const contacts = await contactsApi.getAll(userId);
      set({ contacts });
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addContact: async (userId: string, contact: User) => {
    try {
      set({ isLoading: true });
      await contactsApi.add(userId, contact.id);
      const { contacts } = get();
      if (!contacts.find(c => c.id === contact.id)) {
        set({ contacts: [...contacts, contact] });
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (
    senderId: string,
    receiverId: string,
    content: string,
    senderSecretKey: string,
    receiverPublicKey: string,
    messageType: 'text' | 'image' | 'video' = 'text',
    replyToId?: string,
    autoDeleteSeconds?: number
  ) => {
    try {
      // Generate local message ID
      const localId = generateRandomId();
      
      // Create local message first (optimistic update)
      const localMessage: Message = {
        id: localId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        status: 'sending',
        timestamp: new Date(),
        isOutgoing: true,
      };
      
      // Add to local state
      const { chats } = get();
      const chatMessages = chats.get(receiverId) || [];
      const newChats = new Map(chats);
      newChats.set(receiverId, [...chatMessages, localMessage]);
      set({ chats: newChats });
      
      // Encrypt message
      const { encrypted, ephemeralPublicKey } = encryptMessage(
        content,
        receiverPublicKey,
        senderSecretKey
      );
      
      // Send to server
      const response = await messagesApi.send({
        sender_id: senderId,
        receiver_id: receiverId,
        encrypted_content: encrypted,
        ephemeral_key: ephemeralPublicKey,
        message_type: messageType,
      });
      
      // Update message status
      const updatedChats = new Map(get().chats);
      const messages = updatedChats.get(receiverId) || [];
      const updatedMessages = messages.map(m => 
        m.id === localId 
          ? { ...m, id: response.id, status: 'sent' as const } 
          : m
      );
      updatedChats.set(receiverId, updatedMessages);
      set({ chats: updatedChats });
      
      // Save to local storage
      await get().saveLocalMessages(senderId);
    } catch (error) {
      console.error('Failed to send message:', error);
      set({ error: 'Failed to send message' });
      throw error;
    }
  },

  sendMedia: async (
    senderId: string,
    receiverId: string,
    mediaBase64: string,
    senderSecretKey: string,
    receiverPublicKey: string,
    mediaType: 'image' | 'video' | 'audio',
    fileName: string
  ) => {
    try {
      const localId = generateRandomId();
      
      // Create local message (optimistic update)
      const localMessage: Message = {
        id: localId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: mediaBase64, // Store base64 locally
        message_type: mediaType,
        status: 'sending',
        timestamp: new Date(),
        isOutgoing: true,
      };
      
      // Add to local state
      const { chats } = get();
      const chatMessages = chats.get(receiverId) || [];
      const newChats = new Map(chats);
      newChats.set(receiverId, [...chatMessages, localMessage]);
      set({ chats: newChats });
      
      // Encrypt media
      const { encrypted, ephemeralPublicKey } = encryptMessage(
        mediaBase64,
        receiverPublicKey,
        senderSecretKey
      );
      
      // Upload to server
      const response = await mediaApi.upload({
        sender_id: senderId,
        receiver_id: receiverId,
        encrypted_data: encrypted,
        ephemeral_key: ephemeralPublicKey,
        media_type: mediaType,
        file_name: fileName,
      });
      
      // Update message status
      const updatedChats = new Map(get().chats);
      const messages = updatedChats.get(receiverId) || [];
      const updatedMessages = messages.map(m => 
        m.id === localId 
          ? { ...m, id: response.message_id, status: 'sent' as const } 
          : m
      );
      updatedChats.set(receiverId, updatedMessages);
      set({ chats: updatedChats });
      
      // Save to local storage
      await get().saveLocalMessages(senderId);
    } catch (error) {
      console.error('Failed to send media:', error);
      set({ error: 'Failed to send media' });
      throw error;
    }
  },

  fetchPendingMessages: async (userId: string, secretKey: string) => {
    try {
      const pendingMessages = await messagesApi.getPending(userId);
      
      for (const msg of pendingMessages) {
        let content = '';
        
        if (msg.message_type === 'image' || msg.message_type === 'video') {
          // Fetch and decrypt media
          try {
            const mediaData = await mediaApi.get(msg.encrypted_content);
            const decrypted = decryptMessage(
              mediaData.encrypted_data,
              mediaData.ephemeral_key,
              secretKey
            );
            if (decrypted) {
              content = decrypted; // Base64 image/video data
              await mediaApi.markDelivered(msg.encrypted_content);
            }
          } catch (err) {
            console.error('Failed to fetch media:', err);
            continue;
          }
        } else {
          // Decrypt text message
          const decrypted = decryptMessage(
            msg.encrypted_content,
            msg.ephemeral_key,
            secretKey
          );
          if (decrypted) {
            content = decrypted;
          }
        }
        
        if (content) {
          const message: Message = {
            id: msg.id,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            content,
            message_type: msg.message_type,
            status: 'delivered',
            timestamp: new Date(msg.timestamp),
            isOutgoing: false,
          };
          
          // Add to chat
          const { chats, unreadCounts, currentChat } = get();
          const chatMessages = chats.get(msg.sender_id) || [];
          const newChats = new Map(chats);
          
          // Avoid duplicates
          if (!chatMessages.find(m => m.id === msg.id)) {
            newChats.set(msg.sender_id, [...chatMessages, message]);
            set({ chats: newChats });
            
            // Increment unread count if not in current chat
            if (currentChat !== msg.sender_id) {
              const newUnreadCounts = new Map(unreadCounts);
              const currentCount = newUnreadCounts.get(msg.sender_id) || 0;
              newUnreadCounts.set(msg.sender_id, currentCount + 1);
              set({ unreadCounts: newUnreadCounts });
            }
          }
          
          // Mark as delivered on server (delete from relay)
          await messagesApi.markDelivered(msg.id);
        }
      }
      
      // Save to local storage
      await get().saveLocalMessages(userId);
    } catch (error) {
      console.error('Failed to fetch pending messages:', error);
    }
  },

  setCurrentChat: (contactId: string | null) => {
    set({ currentChat: contactId });
    // Clear unread count when opening chat
    if (contactId) {
      const { unreadCounts } = get();
      const newUnreadCounts = new Map(unreadCounts);
      newUnreadCounts.set(contactId, 0);
      set({ unreadCounts: newUnreadCounts });
    }
  },

  getMessages: (contactId: string): Message[] => {
    return get().chats.get(contactId) || [];
  },

  getUnreadCount: (contactId: string): number => {
    return get().unreadCounts.get(contactId) || 0;
  },

  markAsRead: (contactId: string) => {
    const { unreadCounts } = get();
    const newUnreadCounts = new Map(unreadCounts);
    newUnreadCounts.set(contactId, 0);
    set({ unreadCounts: newUnreadCounts });
  },

  loadLocalMessages: async (userId: string) => {
    try {
      const messagesJson = await AsyncStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${userId}`);
      if (messagesJson) {
        const messagesObj = JSON.parse(messagesJson);
        const chats = new Map<string, Message[]>();
        
        for (const [contactId, messages] of Object.entries(messagesObj)) {
          chats.set(contactId, (messages as any[]).map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })));
        }
        
        set({ chats });
      }
    } catch (error) {
      console.error('Failed to load local messages:', error);
    }
  },

  saveLocalMessages: async (userId: string) => {
    try {
      const { chats } = get();
      const messagesObj: Record<string, Message[]> = {};
      
      chats.forEach((messages, contactId) => {
        messagesObj[contactId] = messages;
      });
      
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.MESSAGES}_${userId}`,
        JSON.stringify(messagesObj)
      );
    } catch (error) {
      console.error('Failed to save local messages:', error);
    }
  },

  updateMessage: (contactId: string, messageId: string, updates: Partial<Message>) => {
    const { chats } = get();
    const messages = chats.get(contactId) || [];
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    const newChats = new Map(chats);
    newChats.set(contactId, updatedMessages);
    set({ chats: newChats });
  },

  deleteMessage: (contactId: string, messageId: string) => {
    const { chats } = get();
    const messages = chats.get(contactId) || [];
    const filteredMessages = messages.filter(msg => msg.id !== messageId);
    const newChats = new Map(chats);
    newChats.set(contactId, filteredMessages);
    set({ chats: newChats });
  },

  clearError: () => set({ error: null }),
}));
