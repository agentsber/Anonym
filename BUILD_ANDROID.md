# Сборка APK для Anonym X

## Требования
- Node.js 18.x (рекомендуется) или 20.x
- npm или yarn
- EAS CLI: `npm install -g eas-cli`
- Аккаунт Expo: https://expo.dev

## Подготовка к сборке

### 1. Клонирование репозитория
```bash
git clone <your-repo-url>
cd <repo-name>/frontend
```

### 2. Установка зависимостей
```bash
# Удалите старые зависимости если есть
rm -rf node_modules yarn.lock package-lock.json

# Установите зависимости
npm install --legacy-peer-deps
# или
yarn install
```

### 3. Настройка Backend URL
Отредактируйте `eas.json` и укажите ваш URL сервера:
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "http://YOUR-SERVER-IP:8001"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://YOUR-DOMAIN.COM"
      }
    }
  }
}
```

### 4. Авторизация в EAS
```bash
eas login
```

### 5. Сборка APK (preview)
```bash
eas build -p android --profile preview
```

Сборка займёт 10-20 минут. После завершения вы получите ссылку для скачивания APK.

### 6. Сборка Production (app-bundle для Google Play)
```bash
eas build -p android --profile production
```

## Локальная сборка (без EAS)
Если хотите собрать локально:

```bash
# Установите Android Studio и настройте ANDROID_HOME

# Создайте нативный проект
npx expo prebuild -p android

# Соберите APK
cd android
./gradlew assembleRelease

# APK будет в: android/app/build/outputs/apk/release/
```

## Текущая конфигурация
- **Expo SDK:** 51
- **React Native:** 0.74.5
- **Target Android SDK:** 34
- **Min Android SDK:** 24

## Проверенные версии зависимостей

```json
{
  "expo": "~51.0.0",
  "react": "18.2.0",
  "react-native": "0.74.5",
  "expo-router": "~3.5.24",
  "react-native-gesture-handler": "~2.16.1",
  "react-native-safe-area-context": "4.10.5",
  "react-native-screens": "3.31.1"
}
```

## Устранение проблем

### Ошибка с зависимостями
```bash
rm -rf node_modules yarn.lock package-lock.json
npm install --legacy-peer-deps
npx expo install --fix
```

### Ошибка Gradle
```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --clean -p android
```

### Node.js проблемы
Если получаете ошибки TypeScript:
- Используйте Node.js 18.x
- Или установите `ts-node` глобально: `npm install -g ts-node typescript`

## Поддержка
При проблемах создайте issue с:
1. Полным логом ошибки
2. Версиями Node.js, npm/yarn
3. Выводом `npm list expo react-native`
