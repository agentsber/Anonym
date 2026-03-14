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

## New Feature: Video Feed (Reels)

### Description
TikTok-style vertical video feed with full functionality:
- Full-screen vertical video scrolling
- Double-tap to like with heart animation
- Comments system
- Video recording and upload from camera/gallery
- Privacy settings (public/contacts/private)
- View counter

### API Endpoints
- `POST /api/videos/upload` - Upload new video
- `GET /api/videos/feed/{user_id}` - Get video feed
- `GET /api/videos/{video_id}` - Get video details
- `GET /api/videos/{video_id}/stream` - Stream video content
- `POST /api/videos/{video_id}/like` - Like/unlike video
- `POST /api/videos/{video_id}/comment` - Add comment
- `GET /api/videos/{video_id}/comments` - Get comments
- `DELETE /api/videos/{video_id}` - Delete video
- `GET /api/videos/user/{user_id}` - Get user's videos

### Frontend Screens
- `/app/(tabs)/reels.tsx` - Video feed screen (new tab)
- `/app/record-video.tsx` - Video recording/upload screen

### Privacy Options
- **Public** - видео видят все пользователи
- **Contacts** - только контакты пользователя
- **Private** - только автор видео

## Architecture

### Backend Endpoints (server.py)
- **Auth:** `/api/auth/register`, `/api/auth/login`
- **Users:** `/api/users/{id}`, `/api/users/{id}/status`, `/api/users/{id}/profile`
- **Messages:** `/api/messages/send`, `/api/messages/pending/{id}`
- **Media:** `/api/media/upload`, `/api/media/{id}`
- **Groups:** `/api/groups`, `/api/groups/{id}/messages`, `/api/groups/{id}/members`
- **Calls:** `/api/calls/initiate`, `/api/calls/answer`, `/api/calls/ice-candidate`
- **Videos:** `/api/videos/upload`, `/api/videos/feed/{id}`, `/api/videos/{id}/*`
- **Admin:** `/api/admin/login`, `/api/admin/stats`, `/api/admin/users`
- **WebSocket:** `/ws/{user_id}` for real-time messaging

### Frontend Structure
```
/app/frontend/app/
├── index.tsx            # Welcome screen
├── auth/register.tsx    # Login/Register
├── chat/[contactId].tsx # Private chat
├── video-call.tsx       # Video/Audio call
├── record-video.tsx     # NEW: Video recording
├── search.tsx           # User search
└── (tabs)/
    ├── index.tsx        # Chats list
    ├── reels.tsx        # NEW: Video feed (TikTok-style)
    └── settings.tsx     # Settings
```

## Updates (2026-03-14)

### Video Feed Implementation
- Added complete video feed API backend (upload, stream, like, comment, delete)
- Created TikTok-style reels screen with vertical scrolling
- Added video recording screen with camera and gallery support
- Privacy controls (public/contacts/private)
- Added "Лента" tab in bottom navigation

### Code Quality
- Fixed all Python linter errors
- Fixed TypeScript compilation errors
- All APIs tested and working

## Admin Panel Access
- **URL:** `http://your-server:8001/api/admin-panel`
- **Credentials:** Configured via ADMIN_USERNAME/ADMIN_PASSWORD env vars

## Future Tasks (Backlog)
- [ ] Test video feed on real devices
- [ ] Optimize video compression
- [ ] Screenshot Protection (FLAG_SECURE)
- [ ] iOS build

## Current Version: 13

## Test Credentials
- calltest1@test.com / test123456
- calltest2@test.com / test123456
