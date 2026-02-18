import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Message, Chat } from '../types';
import { messagesApi, contactsApi, usersApi } from '../services/api';
import { encryptMessage, decryptMessage, generateRandomId } from '../services/crypto';

const STORAGE_KEYS = {
  MESSAGES: 'secure_messenger_messages',
  CONTACTS: 'secure_messenger_contacts',
};

interface ChatState {
  contacts: User[];
  chats: Map<string, Message[]>;
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
    messageType?: 'text' | 'image' | 'video'
  ) => Promise<void>;
  fetchPendingMessages: (userId: string, secretKey: string) => Promise<void>;
  setCurrentChat: (contactId: string | null) => void;
  getMessages: (contactId: string) => Message[];
  loadLocalMessages: (userId: string) => Promise<void>;
  saveLocalMessages: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  contacts: [],
  chats: new Map(),
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
    messageType: 'text' | 'image' | 'video' = 'text'
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

  fetchPendingMessages: async (userId: string, secretKey: string) => {
    try {
      const pendingMessages = await messagesApi.getPending(userId);
      
      for (const msg of pendingMessages) {
        // Decrypt message
        const decrypted = decryptMessage(
          msg.encrypted_content,
          msg.ephemeral_key,
          secretKey
        );
        
        if (decrypted) {
          const message: Message = {
            id: msg.id,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            content: decrypted,
            message_type: msg.message_type,
            status: 'delivered',
            timestamp: new Date(msg.timestamp),
            isOutgoing: false,
          };
          
          // Add to chat
          const { chats } = get();
          const chatMessages = chats.get(msg.sender_id) || [];
          const newChats = new Map(chats);
          
          // Avoid duplicates
          if (!chatMessages.find(m => m.id === msg.id)) {
            newChats.set(msg.sender_id, [...chatMessages, message]);
            set({ chats: newChats });
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
  },

  getMessages: (contactId: string): Message[] => {
    return get().chats.get(contactId) || [];
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

  clearError: () => set({ error: null }),
}));
