import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import * as Crypto from 'expo-crypto';
import { KeyPair, CryptoKeys } from '../types';

// Setup PRNG for tweetnacl in React Native
// This is required because React Native doesn't have crypto.getRandomValues by default
nacl.setPRNG((x: Uint8Array, n: number) => {
  // Use expo-crypto for secure random bytes
  const randomBytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i];
  }
});

// Generate a new key pair using Curve25519
export const generateKeyPair = (): KeyPair => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
};

// Generate identity keys for X3DH protocol
export const generateIdentityKeys = (): CryptoKeys => {
  // Identity key pair
  const identityKeyPair = generateKeyPair();
  
  // Signed pre-key pair
  const signedPreKeyPair = generateKeyPair();
  
  // Sign the pre-key with identity key (simplified - using nacl.sign)
  const signKeyPair = nacl.sign.keyPair();
  const preKeySignature = encodeBase64(
    nacl.sign.detached(
      decodeBase64(signedPreKeyPair.publicKey),
      signKeyPair.secretKey
    )
  );
  
  return {
    identityKeyPair,
    signedPreKeyPair,
    preKeySignature,
  };
};

// Encrypt a message using NaCl box (Curve25519-XSalsa20-Poly1305)
export const encryptMessage = (
  message: string,
  receiverPublicKey: string,
  senderSecretKey: string
): { encrypted: string; nonce: string; ephemeralPublicKey: string } => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = decodeUTF8(message);
  const receiverPubKeyBytes = decodeBase64(receiverPublicKey);
  const senderSecKeyBytes = decodeBase64(senderSecretKey);
  
  // Generate ephemeral key pair for forward secrecy
  const ephemeralKeyPair = nacl.box.keyPair();
  
  const encrypted = nacl.box(
    messageBytes,
    nonce,
    receiverPubKeyBytes,
    ephemeralKeyPair.secretKey
  );
  
  // Combine nonce and ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  
  return {
    encrypted: encodeBase64(combined),
    nonce: encodeBase64(nonce),
    ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
  };
};

// Decrypt a message
export const decryptMessage = (
  encryptedData: string,
  ephemeralPublicKey: string,
  receiverSecretKey: string
): string | null => {
  try {
    const combined = decodeBase64(encryptedData);
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const ciphertext = combined.slice(nacl.box.nonceLength);
    
    const ephemeralPubKeyBytes = decodeBase64(ephemeralPublicKey);
    const receiverSecKeyBytes = decodeBase64(receiverSecretKey);
    
    const decrypted = nacl.box.open(
      ciphertext,
      nonce,
      ephemeralPubKeyBytes,
      receiverSecKeyBytes
    );
    
    if (!decrypted) {
      return null;
    }
    
    return encodeUTF8(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Derive shared secret for session (X3DH simplified)
export const deriveSharedSecret = (
  theirPublicKey: string,
  ourSecretKey: string
): string => {
  const theirPubKeyBytes = decodeBase64(theirPublicKey);
  const ourSecKeyBytes = decodeBase64(ourSecretKey);
  
  // Use scalar multiplication to derive shared secret
  const sharedSecret = nacl.box.before(theirPubKeyBytes, ourSecKeyBytes);
  
  return encodeBase64(sharedSecret);
};

// Generate a random ID
export const generateRandomId = (): string => {
  const randomBytes = nacl.randomBytes(16);
  return encodeBase64(randomBytes).replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
};
