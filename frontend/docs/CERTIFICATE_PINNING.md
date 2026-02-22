# Certificate Pinning - Руководство по настройке

## Что такое Certificate Pinning?

Certificate Pinning - это механизм защиты от атак "человек посередине" (MITM). 
Приложение проверяет, что сертификат сервера соответствует заранее известному 
(закрепленному) сертификату, и отклоняет соединения с недоверенными сертификатами.

## Как это работает в Anonym X

Модуль Certificate Pinning находится в `/frontend/src/security/`:

- `certificatePinning.ts` - Основная логика проверки сертификатов
- `securityManager.ts` - Менеджер безопасности для инициализации

## Настройка для Production

### 1. Получите SHA-256 fingerprint вашего сертификата

```bash
# Для сертификата сервера
openssl s_client -connect api.yourserver.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl rsa -pubin -outform der 2>/dev/null | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# Или для файла сертификата
openssl x509 -in certificate.pem -pubkey -noout | \
  openssl rsa -pubin -outform der 2>/dev/null | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### 2. Сконфигурируйте pinning в приложении

В файле `src/security/securityManager.ts`:

```typescript
// В методе initialize() добавьте ваши сертификаты:
this.configureProductionCertificates({
  apiHost: 'api.yourserver.com',
  certificates: [
    'ABC123...', // Основной сертификат (SHA-256 hex)
    'XYZ789...', // Резервный сертификат
  ],
});
```

### 3. Android Native Configuration (опционально)

Создайте файл `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config>
    <domain includeSubdomains="true">api.yourserver.com</domain>
    <pin-set>
      <pin digest="SHA-256">BASE64_ENCODED_HASH_1</pin>
      <pin digest="SHA-256">BASE64_ENCODED_HASH_2</pin>
    </pin-set>
  </domain-config>
</network-security-config>
```

И добавьте в `AndroidManifest.xml`:
```xml
<application
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

### 4. iOS Configuration (опционально)

Добавьте в `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSPinnedDomains</key>
  <dict>
    <key>api.yourserver.com</key>
    <dict>
      <key>NSIncludesSubdomains</key>
      <true/>
      <key>NSPinnedLeafIdentities</key>
      <array>
        <dict>
          <key>SPKI-SHA256-BASE64</key>
          <string>YOUR_BASE64_HASH</string>
        </dict>
      </array>
    </dict>
  </dict>
</dict>
```

## Важные замечания

1. **Backup pins**: Всегда добавляйте минимум 2 сертификата (основной и резервный)
2. **Обновление сертификатов**: При смене сертификата на сервере, сначала добавьте 
   новый сертификат в приложение, затем обновите сервер
3. **Development**: Pinning отключен в development режиме (`__DEV__`)
4. **Тестирование**: Используйте инструменты вроде Charles Proxy для проверки 
   что pinning работает

## API

```typescript
import { 
  configureCertificatePinning,
  setCertificatePinningEnabled,
  addCertificatePin,
  getCertificatePinningStatus 
} from './src/security';

// Включить pinning
setCertificatePinningEnabled(true);

// Добавить pin для хоста
addCertificatePin('api.example.com', 'sha256fingerprint', true);

// Получить статус
const status = getCertificatePinningStatus();
console.log(status);
// { enabled: true, platform: 'android', hostsConfigured: 1, ... }
```

## Безопасность

- Fingerprints хранятся в коде приложения
- Не логируйте fingerprints в production
- Используйте обфускацию кода для дополнительной защиты
