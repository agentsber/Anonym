export interface User {
  id: string;
  username: string;
  public_key: string;
  identity_key: string;
  signed_prekey: string;
  prekey_signature: string;
  created_at?: string;
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
