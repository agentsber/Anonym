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
- [x] Video Feed (Reels) - TikTok-style
- [x] Video Editor with Filters, Text, Stickers & Music
- [x] **Push & Local Notifications**
- [x] **MongoDB Performance Optimization (Indexes)**

## New Features (2026-03-14)

### Push Notifications
- Expo Push Notifications для фоновых уведомлений
- Локальные уведомления внутри приложения
- Настройки: вкл/выкл, звук, вибрация, превью текста
- Отключение уведомлений для отдельных чатов
- Push отправляются офлайн пользователям

### Performance Optimization
Добавлены MongoDB индексы для ускорения запросов:
- `messages`: receiver_id+status, sender_id+receiver_id, timestamp, id
- `users`: id
- `contacts`: user_id
- `group_messages`: group_id+timestamp

**Результат:** Время ответа API ~200-300ms (сетевая латентность)

### Files
- `/app/frontend/src/stores/notificationStore.ts` - Store для уведомлений
- `/app/frontend/app/notification-settings.tsx` - Экран настроек
- `/app/backend/server.py` - Push API endpoints + indexes

## API Endpoints

### Notifications
- `POST /api/users/push-token` - Регистрация push токена
- `DELETE /api/users/push-token/{user_id}` - Удаление токена
- `POST /api/notifications/send` - Отправка уведомления

## Current Version: 15

## Future Tasks (Backlog)
- [ ] Redis для масштабирования WebSocket
- [ ] Server-side video processing (ffmpeg)
- [ ] Screenshot Protection (FLAG_SECURE)
- [ ] iOS build

## Test Credentials
- calltest1@test.com / test123456
- calltest2@test.com / test123456
