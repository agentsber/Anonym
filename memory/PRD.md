# Anonym X - Secure Android Messenger

## Original Problem Statement
Разработка защищённого Android-мессенджера с E2E шифрованием.

## Platform & Tech Stack
- **Frontend:** React Native (Expo SDK 54), TypeScript, Zustand, expo-router
- **Backend:** Python, FastAPI, MongoDB, WebSocket
- **Deployment:** Docker, docker-compose, EAS Build (APK)

## Core Features (Completed)
- [x] User registration (email/password)
- [x] User search
- [x] E2E encrypted messaging
- [x] Read status ("прочитано")
- [x] Online status with real-time updates
- [x] Disappearing messages
- [x] Reply to message
- [x] Edit/delete messages
- [x] Message forwarding
- [x] Group chats with advanced features
- [x] Voice messages (recording, playback)
- [x] Stickers
- [x] Modern dark theme
- [x] Docker deployment setup
- [x] Custom splash screen
- [x] Video/Audio Calls (WebRTC)
- [x] Admin Panel with Server Management
- [x] Profile Editing
- [x] **Video Feed (Reels) - TikTok-style vertical video feed**
- [x] **Video Editor with Filters, Text, Stickers & Music**

## New Feature: Video Editor

### Features Implemented
1. **Filters:**
   - 8 цветовых пресетов: Normal, Vintage, Noir, Warm, Cold, Vivid, Muted, Sepia
   - Базовые настройки: Яркость, Контраст, Насыщенность

2. **Trim/Cut:**
   - Обрезка видео по времени (начало/конец)
   - Визуальный таймлайн с превью

3. **Text Overlays:**
   - Добавление текста на видео
   - 8 цветов для текста
   - Перетаскивание текста по экрану
   - Удаление текста

4. **Stickers:**
   - 15 популярных эмодзи-стикеров
   - Перетаскивание стикеров по экрану
   - Удаление стикеров

5. **Music:**
   - Выбор аудио с устройства (через DocumentPicker)
   - Регулировка громкости музыки

### Editor Flow
1. Камера/Галерея → 2. Редактор → 3. Публикация

### Technical Implementation
- **Frontend:** `/app/frontend/src/components/VideoEditor.tsx`
- **Screen:** `/app/frontend/app/record-video.tsx`
- **Backend:** Editor metadata сохраняется в MongoDB вместе с видео

## Architecture

### Backend Endpoints (server.py)
- **Videos:** `/api/videos/upload` (with editor_metadata), `/api/videos/feed/{id}`, `/api/videos/{id}/*`
- **Auth:** `/api/auth/register`, `/api/auth/login`
- **Users:** `/api/users/{id}`, `/api/users/{id}/status`
- **Messages:** `/api/messages/send`, `/api/messages/pending/{id}`
- **Calls:** `/api/calls/initiate`, `/api/calls/answer`, `/api/calls/ice-candidate`
- **Admin:** `/api/admin/login`, `/api/admin/stats`

### Frontend Structure
```
/app/frontend/
├── app/
│   ├── record-video.tsx     # Recording + Editor integration
│   └── (tabs)/
│       ├── reels.tsx        # Video feed
│       └── ...
├── src/
│   └── components/
│       └── VideoEditor.tsx  # Full video editor component
```

## Updates (2026-03-14)

### Video Editor Implementation
- Created full video editor component with 6 tabs: Filters, Adjust, Trim, Text, Stickers, Music
- Integrated DocumentPicker for audio file selection
- Added draggable overlays for text and stickers
- Editor metadata saved with video uploads

### Dependencies Added
- `@react-native-community/slider` - для слайдеров настроек
- `expo-document-picker` - для выбора музыки

## Current Version: 14

## Future Tasks (Backlog)
- [ ] Server-side video processing with ffmpeg
- [ ] Real-time filter preview
- [ ] More sticker packs
- [ ] Screenshot Protection (FLAG_SECURE)
- [ ] iOS build

## Test Credentials
- calltest1@test.com / test123456
- calltest2@test.com / test123456
