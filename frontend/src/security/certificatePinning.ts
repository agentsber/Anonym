import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

// Certificate pinning configuration
// These are SHA-256 fingerprints of the server's SSL certificate
// In production, replace with your actual server certificate fingerprints

export interface PinningConfig {
  enabled: boolean;
  hosts: {
    [hostname: string]: {
      // SHA-256 fingerprints of certificates (primary and backup)
      fingerprints: string[];
      // Whether to enforce pinning strictly
      strict: boolean;
    };
  };
}

// Default configuration - DISABLED by default for development
// Enable and configure for production builds
const defaultConfig: PinningConfig = {
  enabled: false, // Set to true in production
  hosts: {
    // Example: 'api.yourserver.com'
    // Add your production server certificates here
    // Format: SHA-256 fingerprint without colons, lowercase
    // 'api.example.com': {
    //   fingerprints: [
    //     'abc123def456...', // Primary certificate
    //     'xyz789uvw012...', // Backup certificate
    //   ],
    //   strict: true,
    // },
  },
};

let currentConfig: PinningConfig = { ...defaultConfig };

/**
 * Configure certificate pinning
 * Call this at app startup with your production certificates
 */
export function configureCertificatePinning(config: Partial<PinningConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    hosts: {
      ...currentConfig.hosts,
      ...(config.hosts || {}),
    },
  };
  
  if (__DEV__) {
    console.log('[CertPinning] Configuration updated:', {
      enabled: currentConfig.enabled,
      hosts: Object.keys(currentConfig.hosts),
    });
  }
}

/**
 * Check if certificate pinning is enabled for a given hostname
 */
export function isPinningEnabled(hostname: string): boolean {
  if (!currentConfig.enabled) return false;
  return hostname in currentConfig.hosts;
}

/**
 * Get pinning configuration
 */
export function getPinningConfig(): PinningConfig {
  return { ...currentConfig };
}

/**
 * Enable or disable certificate pinning globally
 */
export function setCertificatePinningEnabled(enabled: boolean): void {
  currentConfig.enabled = enabled;
  
  if (__DEV__) {
    console.log('[CertPinning] Pinning', enabled ? 'enabled' : 'disabled');
  }
}

/**
 * Add a certificate fingerprint for a host
 */
export function addCertificatePin(
  hostname: string, 
  fingerprint: string, 
  strict: boolean = true
): void {
  if (!currentConfig.hosts[hostname]) {
    currentConfig.hosts[hostname] = {
      fingerprints: [],
      strict,
    };
  }
  
  // Normalize fingerprint (lowercase, no colons)
  const normalizedFingerprint = fingerprint.toLowerCase().replace(/:/g, '');
  
  if (!currentConfig.hosts[hostname].fingerprints.includes(normalizedFingerprint)) {
    currentConfig.hosts[hostname].fingerprints.push(normalizedFingerprint);
  }
}

/**
 * Remove all pins for a host
 */
export function removeCertificatePins(hostname: string): void {
  delete currentConfig.hosts[hostname];
}

/**
 * Validate a certificate fingerprint against pinned certificates
 * This is used by the network layer to verify connections
 */
export function validateCertificate(
  hostname: string, 
  certificateFingerprint: string
): { valid: boolean; reason?: string } {
  // If pinning is disabled, allow all connections
  if (!currentConfig.enabled) {
    return { valid: true };
  }
  
  // If no pins for this host, allow connection (unless strict mode)
  const hostConfig = currentConfig.hosts[hostname];
  if (!hostConfig) {
    return { valid: true };
  }
  
  // Normalize the fingerprint
  const normalizedFingerprint = certificateFingerprint.toLowerCase().replace(/:/g, '');
  
  // Check if the fingerprint matches any of the pinned certificates
  const isValid = hostConfig.fingerprints.includes(normalizedFingerprint);
  
  if (!isValid && hostConfig.strict) {
    return {
      valid: false,
      reason: `Certificate pinning failed for ${hostname}. ` +
              `Received fingerprint does not match any pinned certificates.`,
    };
  }
  
  return { valid: isValid };
}

/**
 * Generate SHA-256 hash of a certificate (for debugging/setup)
 */
export async function hashCertificate(certificateDER: ArrayBuffer): Promise<string> {
  const hashBuffer = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Array.from(new Uint8Array(certificateDER))
      .map(b => String.fromCharCode(b))
      .join(''),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return hashBuffer;
}

/**
 * Security status for certificate pinning
 */
export interface CertificatePinningStatus {
  enabled: boolean;
  platform: string;
  hostsConfigured: number;
  configuredHosts: string[];
}

/**
 * Get current certificate pinning status
 */
export function getCertificatePinningStatus(): CertificatePinningStatus {
  return {
    enabled: currentConfig.enabled,
    platform: Platform.OS,
    hostsConfigured: Object.keys(currentConfig.hosts).length,
    configuredHosts: Object.keys(currentConfig.hosts),
  };
}
