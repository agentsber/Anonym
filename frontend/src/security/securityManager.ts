import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  configureCertificatePinning, 
  setCertificatePinningEnabled,
  addCertificatePin,
  getCertificatePinningStatus,
  PinningConfig 
} from './certificatePinning';

const STORAGE_KEY = 'certificate_pinning_enabled';

/**
 * Security Manager - handles all security-related configurations
 */
class SecurityManager {
  private initialized: boolean = false;

  /**
   * Initialize security features
   * Call this at app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load certificate pinning preference
      const pinningEnabled = await AsyncStorage.getItem(STORAGE_KEY);
      
      // Configure certificate pinning based on environment
      if (__DEV__) {
        // Disable in development
        setCertificatePinningEnabled(false);
      } else {
        // Enable in production if user has it enabled
        setCertificatePinningEnabled(pinningEnabled === 'true');
        
        // Add production certificate pins here
        // Example:
        // addCertificatePin('api.anonyx.com', 'your-sha256-fingerprint', true);
      }
      
      this.initialized = true;
      
      if (__DEV__) {
        console.log('[SecurityManager] Initialized:', getCertificatePinningStatus());
      }
    } catch (error) {
      console.error('[SecurityManager] Initialization error:', error);
    }
  }

  /**
   * Enable certificate pinning
   */
  async enableCertificatePinning(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setCertificatePinningEnabled(true);
  }

  /**
   * Disable certificate pinning
   */
  async disableCertificatePinning(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, 'false');
    setCertificatePinningEnabled(false);
  }

  /**
   * Check if certificate pinning is enabled
   */
  async isCertificatePinningEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === 'true';
  }

  /**
   * Get security status
   */
  getStatus(): {
    certificatePinning: ReturnType<typeof getCertificatePinningStatus>;
    platform: string;
  } {
    return {
      certificatePinning: getCertificatePinningStatus(),
      platform: Platform.OS,
    };
  }

  /**
   * Show security info to user
   */
  showSecurityInfo(): void {
    const status = this.getStatus();
    const message = [
      `Платформа: ${status.platform.toUpperCase()}`,
      '',
      '🔒 Certificate Pinning:',
      `Статус: ${status.certificatePinning.enabled ? 'Включено' : 'Отключено'}`,
      `Защищённых хостов: ${status.certificatePinning.hostsConfigured}`,
      '',
      'Certificate Pinning защищает от атак',
      '"человек посередине" (MITM), проверяя',
      'подлинность сертификата сервера.',
    ].join('\n');

    Alert.alert('Безопасность соединения', message);
  }

  /**
   * Configure production certificates
   * Call this with your actual production certificates
   */
  configureProductionCertificates(config: {
    apiHost: string;
    certificates: string[];
  }): void {
    config.certificates.forEach(cert => {
      addCertificatePin(config.apiHost, cert, true);
    });
    
    if (!__DEV__) {
      setCertificatePinningEnabled(true);
    }
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();

// Export for direct access
export { getCertificatePinningStatus };
