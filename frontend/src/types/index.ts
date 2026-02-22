export interface User {
  id: string;
  username: string;
  email?: string;
  public_key: string;
  identity_key: string;
  signed_prekey: string;
  prekey_signature: string;
  created_at?: string;
  online?: boolean;
  last_seen?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string; // Decrypted content
  encrypted_content?: string;
  ephemeral_key?: string;
  message_type: 'text' | 'image' | 'video';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  timestamp: Date;
  isOutgoing: boolean;
  reply_to_id?: string;
  reply_to?: Message; // Referenced message for replies
  auto_delete_seconds?: number;
  expires_at?: Date;
  edited?: boolean;
  deleted?: boolean;
}

export interface Chat {
  contact: User;
  lastMessage?: Message;
  unreadCount: number;
}

export interface KeyPair {
  publicKey: string; // Base64
  secretKey: string; // Base64
}

export interface CryptoKeys {
  identityKeyPair: KeyPair;
  signedPreKeyPair: KeyPair;
  preKeySignature: string;
}

export interface Sticker {
  id: string;
  pack_id: string;
  emoji: string;
  image_url: string;
}

export interface StickerPack {
  id: string;
  name: string;
  stickers: Sticker[];
}

// Auto-delete timer options (in seconds)
export const AUTO_DELETE_OPTIONS = [
  { label: 'Выкл', value: null },
  { label: '1 мин', value: 60 },
  { label: '1 час', value: 3600 },
  { label: '24 часа', value: 86400 },
];

// Group types
export interface Group {
  id: string;
  name: string;
  creator_id: string;
  avatar_color: string;
  created_at: string;
  members: GroupMember[];
  member_count?: number;
  last_message?: {
    content: string | null;
    sender_username: string | null;
    timestamp: string | null;
  } | null;
}

export interface GroupMember {
  user_id: string;
  username: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  message_type: 'text' | 'image' | 'sticker' | 'voice' | string;
  timestamp: string;
  reply_to_id?: string;
  media_url?: string;
  is_edited?: boolean;
  is_pinned?: boolean;
  is_deleted?: boolean;
  is_forwarded?: boolean;
  forwarded_from?: string;
}
