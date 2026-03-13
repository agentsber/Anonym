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
- [x] Online status
- [x] Disappearing messages
- [x] Reply to message
- [x] Edit/delete messages
- [x] Message forwarding
- [x] Group chats with advanced features
- [x] Voice messages
- [x] Stickers
- [x] Modern dark theme
- [x] Docker deployment setup
- [x] Custom splash screen
- [x] Video Calls with WebRTC (partially implemented)
- [x] Admin Panel

## Dependency Fix (2026-03-13)
### Problem
APK build consistently failed due to incompatibility between:
- Expo SDK 54/53 uses `expo-modules-core` with `"main": "src/index.ts"` (TypeScript source)
- Node.js 20 cannot execute `.ts` files directly
- This caused `ERR_UNKNOWN_FILE_EXTENSION` errors

### Solution
Downgraded to **Expo SDK 51** which uses:
- `expo-modules-core@1.12.26` with `"main": "build/index.js"` (compiled JS)
- React Native 0.74.5
- React 18.2.0

### Verified Working Dependencies
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

## Architecture
```
/app
├── backend/
│   ├── Dockerfile
│   ├── server.py
│   ├── admin/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (tabs)/ - Main tabs
│   │   ├── auth/ - Login/Register
│   │   ├── chat/ - 1-on-1 chats
│   │   ├── group/ - Group chats
│   │   ├── security/ - PIN lock
│   │   └── video-call.tsx
│   ├── src/
│   │   ├── services/
│   │   ├── stores/
│   │   └── components/
│   └── assets/
├── BUILD_ANDROID.md
├── BUILD_IOS.md
├── DEPLOY.md
└── docker-compose.yml
```

## Admin Panel
- **URL:** `http://your-server/admin`
- **Credentials:** Configured via `ADMIN_USERNAME`, `ADMIN_PASSWORD` env vars
- **Features:** User management, Groups, Server logs, System info, Backups

## Backend Deployment (User Server)
- **Server IP:** 5.42.101.121
- **Port:** 8001
- **Admin Panel:** http://5.42.101.121/admin

## Future Tasks (Backlog)
- [ ] **P0** Test Video Calls on mobile device
- [ ] **P1** Complete Admin Panel enhancements
- [ ] **P2** Screenshot Protection (FLAG_SECURE)
- [ ] **P2** iOS build and testing

## Key API Endpoints
- `/api/auth/register` - Register user
- `/api/auth/login` - Login
- `/api/users/search` - Search users
- `/api/messages/send` - Send message
- `/api/groups/*` - Group operations
- `/api/calls/*` - Video call signaling
- `/api/admin/*` - Admin panel API

## Database Schema
- **users:** `{_id, username, email, password_hash, contacts, last_seen}`
- **groups:** `{_id, name, owner, members, admins, banned_users, pinned_messages}`
- **messages:** `{_id, sender, receiver, content, timestamp, type, status}`
- **calls:** `{_id, caller_id, callee_id, status, started_at, ended_at}`
