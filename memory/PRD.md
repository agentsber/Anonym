# Anonym X - Secure Android Messenger

## Original Problem Statement
Разработка защищённого Android-мессенджера с E2E шифрованием.

## Platform & Tech Stack
- **Frontend:** React Native (Expo SDK 51), TypeScript, Zustand, expo-router
- **Backend:** Python, FastAPI, MongoDB, python-socketio
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

## Updates (2026-03-13)

### Chat Improvements
- Added audio/video call buttons in chat header
- Added voice recording with animated UI
- Fixed keyboard covering input field
- Improved online status display ("онлайн" instead of "в сети")

### Admin Panel
- Server management (clear cache, cleanup DB, compact DB)
- Real-time logs
- System monitoring (CPU, RAM, Disk)
- User/Group management
- Backups

### Bug Fixes
- Fixed PRNG error for crypto on mobile
- Fixed TypeScript errors
- Fixed LinearGradient color types
- Added missing chatStore methods

## Admin Panel Access
- **URL:** `http://your-server:8001/api/admin-panel`
- **Credentials:** `bardiyan` / `AlexBsever15` (user's server)

## Future Tasks (Backlog)
- [ ] Test video/audio calls on mobile
- [ ] Improve chat design
- [ ] Screenshot Protection (FLAG_SECURE)
- [ ] iOS build and testing

## Current Version: 12
