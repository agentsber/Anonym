# 📱 Сборка Anonym X для iOS

## Требования

### На вашем Mac:
- macOS 12.0+ (Monterey или новее)
- Xcode 14+ (из App Store)
- Node.js 18+ 
- Apple Developer Account ($99/год для публикации)

### Для тестирования на устройстве без публикации:
- Бесплатный Apple ID достаточно
- iPhone/iPad с iOS 14+

---

## Быстрый старт (симулятор)

### 1. Скачайте проект
```bash
git clone https://github.com/agentsber/anonym.git
cd anonym/frontend
```

### 2. Установите зависимости
```bash
npm install -g eas-cli
npm install
```

### 3. Настройте URL сервера
```bash
echo "EXPO_PUBLIC_BACKEND_URL=http://5.42.101.121:8001" > .env
```

### 4. Войдите в Expo
```bash
eas login
```

### 5. Сборка для симулятора
```bash
eas build -p ios --profile simulator
```

После сборки скачайте .app файл и перетащите в симулятор iOS.

---

## Сборка IPA для устройства

### 1. Создайте Apple Developer аккаунт
Перейдите на https://developer.apple.com и зарегистрируйтесь.

### 2. Сборка с Ad Hoc профилем
```bash
eas build -p ios --profile preview
```

EAS автоматически создаст сертификаты и provisioning profiles.

### 3. Установка на устройство
После сборки вы получите ссылку на .ipa файл.
Установите через:
- Expo Dashboard (сканируйте QR код с устройства)
- Apple Configurator 2
- TestFlight (для production сборки)

---

## Production сборка для App Store

### 1. Настройте submit в eas.json
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "ваш@email.com",
      "ascAppId": "APP_ID_ИЗ_APP_STORE_CONNECT"
    }
  }
}
```

### 2. Создайте приложение в App Store Connect
1. Перейдите на https://appstoreconnect.apple.com
2. Создайте новое приложение
3. Укажите Bundle ID: `com.anonx.message`
4. Скопируйте Apple ID приложения в eas.json

### 3. Сборка и отправка
```bash
eas build -p ios --profile production
eas submit -p ios --latest
```

---

## Локальная сборка (без EAS Cloud)

### 1. Prebuild
```bash
npx expo prebuild -p ios
```

### 2. Откройте в Xcode
```bash
open ios/anonymx.xcworkspace
```

### 3. Настройте Signing
- Выберите Team в Signing & Capabilities
- Xcode автоматически создаст provisioning profile

### 4. Сборка
- Выберите устройство или симулятор
- Product → Build (⌘B)
- Product → Archive (для App Store)

---

## Разрешения iOS

Приложение запрашивает следующие разрешения:

| Разрешение | Описание |
|------------|----------|
| Camera | Фото/видео в чате, видеозвонки |
| Microphone | Голосовые сообщения, видеозвонки |
| Photo Library | Выбор медиа для отправки |
| Face ID | Биометрическая разблокировка |
| VoIP | Фоновые видеозвонки |

---

## Решение проблем

### "No signing certificate"
```bash
# Сбросить credentials и создать заново
eas credentials -p ios
```

### "Bundle ID already exists"
Измените bundleIdentifier в app.json на уникальный.

### "Build failed"
```bash
# Очистите кэш и пересоберите
rm -rf node_modules ios
npm install
npx expo prebuild -p ios --clean
```

### Проблемы с CocoaPods
```bash
cd ios
pod deintegrate
pod install
```

---

## Полезные ссылки

- [Expo iOS Builds](https://docs.expo.dev/build/building-ios/)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [TestFlight](https://developer.apple.com/testflight/)
