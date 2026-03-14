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

## Architecture

### Backend Endpoints (server.py)
- **Auth:** `/api/auth/register`, `/api/auth/login`
- **Users:** `/api/users/{id}`, `/api/users/{id}/status`, `/api/users/{id}/profile`
- **Messages:** `/api/messages/send`, `/api/messages/pending/{id}`, `/api/messages/{id}/edit`, `/api/messages/{id}/read`
- **Media:** `/api/media/upload`, `/api/media/{id}`
- **Groups:** `/api/groups`, `/api/groups/{id}/messages`, `/api/groups/{id}/members`
- **Calls:** `/api/calls/initiate`, `/api/calls/answer`, `/api/calls/ice-candidate`, `/api/calls/action`, `/api/calls/history/{id}`
- **Admin:** `/api/admin/login`, `/api/admin/stats`, `/api/admin/users`, `/api/admin/server/*`
- **WebSocket:** `/ws/{user_id}` for real-time messaging and call signaling

### Frontend Structure
```
/app/frontend/
├── app/                      # expo-router pages
│   ├── index.tsx            # Welcome screen
│   ├── auth/register.tsx    # Login/Register
│   ├── chat/[contactId].tsx # Private chat
│   ├── group/[groupId].tsx  # Group chat
│   ├── video-call.tsx       # Video/Audio call screen
│   ├── search.tsx           # User search
│   ├── profile/             # Profile editing
│   └── (tabs)/              # Main tabs
├── src/
│   ├── services/
│   │   ├── api.ts           # API client
│   │   ├── crypto.ts        # E2E encryption
│   │   └── webrtc.ts        # WebRTC service
│   ├── stores/
│   │   ├── authStore.ts     # Auth state
│   │   ├── chatStore.ts     # Messages state
│   │   └── callStore.ts     # Calls state
│   └── components/
│       ├── ChatBubble.tsx
│       └── IncomingCallOverlay.tsx
```

## Updates (2026-03-14)

### Code Cleanup
- Fixed all Python linter errors (bare except → Exception, duplicate function names, undefined variables)
- Fixed TypeScript compilation - no errors
- All JavaScript linting passed

### Verified Working
- Backend API healthy and responding
- All call endpoints functional
- WebSocket signaling ready
- User authentication working

## Admin Panel Access
- **URL:** `http://your-server:8001/api/admin-panel`
- **Credentials:** Configured via ADMIN_USERNAME/ADMIN_PASSWORD env vars
- **User's Server:** `bardiyan` / `AlexBsever15`

## Known Issues

### User's Production Server (5.42.101.121)
The admin panel is not accessible on the user's server because:
1. Backend runs from `/app` directory but user updates files in `/root/anonym`
2. User needs to copy latest `server.py` and `admin/` to `/app` and restart uvicorn

### Web Version (Expo)
- `import.meta` error from react-native-webrtc (mobile-only library)
- Web preview may show loading spinner indefinitely
- Mobile APK version works correctly

## Future Tasks (Backlog)
- [ ] Test video/audio calls on real devices
- [ ] Improve chat design
- [ ] Screenshot Protection (FLAG_SECURE)
- [ ] iOS build and testing
- [ ] Fix admin panel on user's production server

## Current Version: 12

## Test Credentials (Development)
- **User 1:** calltest1@test.com / test123456
- **User 2:** calltest2@test.com / test123456
