# Anonym X - Secure Android Messenger

## Original Problem Statement
Разработка защищённого Android-мессенджера с E2E шифрованием.

## Platform & Tech Stack
- **Frontend:** React Native (Expo), TypeScript, Zustand, expo-router
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
- [x] Group chats with advanced features:
  - Edit/delete own messages
  - Pin/unpin messages
  - Assign/unassign admins
  - Ban/unban users
  - Search within chat
  - View group info
  - Send media files (images/videos)
- [x] Voice messages
- [x] Stickers
- [x] Modern dark theme (COMPLETED - 2025-02-22)
- [x] Docker deployment setup
- [x] Custom splash screen

## Dark Theme Implementation (2025-02-22)
All screens now use consistent dark theme:
- Background: #0A0A0A
- Surface: #1A1A1A
- Surface Light: #252525
- Primary: #6C5CE7
- Primary Light: #A29BFE
- Text: #FFFFFF
- Text Secondary: #8E8E93
- Text Muted: #555555
- Border: #333333

**Files updated:**
- `/app/frontend/app/_layout.tsx`
- `/app/frontend/app/auth/login.tsx`
- `/app/frontend/app/search.tsx`
- `/app/frontend/app/security/lock.tsx`
- `/app/frontend/app/security/setup-pin.tsx`
- `/app/frontend/src/components/ChatBubble.tsx`

## Future Tasks (Backlog)
- [ ] **P2** Screenshot Protection: Implement `FLAG_SECURE` on Android

## Completed Tasks
- [x] **P3** Data Wipe on Incorrect PIN: Track failed PIN attempts and wipe data after threshold (COMPLETED - 2025-02-22)
- [x] **P3** Certificate Pinning: Enhanced security against MITM attacks (COMPLETED - 2025-02-22)
- [x] **Deployment Preparation** - Full production deployment setup (COMPLETED - 2025-02-22)

## P3 Features Implemented (2025-02-22)

### Data Wipe on Failed PIN Attempts
- Added `isWipeEnabled` и `isDataWiped` states to securityStore
- `enableWipeOnMaxAttempts()` function to toggle the feature
- `wipeAllData()` function that clears all AsyncStorage data
- Updated `verifyPin()` to trigger wipe after 5 failed attempts (if enabled)
- UI toggle in Settings (shows only when PIN is set)
- Warning messages in Lock screen when attempts are running low

**Files updated:**
- `src/stores/securityStore.ts` - Added wipe logic
- `app/security/lock.tsx` - Warning messages
- `app/(tabs)/settings.tsx` - Toggle switch for auto-wipe

## Admin Panel (Completed 2025-02-22)

### Features
- **Dashboard:** Статистика пользователей, групп, сообщений
- **Users Management:** Просмотр, бан/разбан, удаление пользователей
- **Groups Management:** Просмотр и удаление групп
- **Server Logs:** Просмотр логов в реальном времени
- **System Info:** CPU, память, диск
- **Backups:** Создание и просмотр резервных копий

### Access
- URL: `https://your-domain.com/admin`
- Default credentials: `admin / admin123`
- Credentials can be changed via env vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD`

### API Endpoints
- `POST /api/admin/login` - Login
- `GET /api/admin/stats` - Statistics
- `GET /api/admin/users` - List users
- `POST /api/admin/users/{id}/ban` - Ban user
- `DELETE /api/admin/users/{id}` - Delete user
- `GET /api/admin/groups` - List groups
- `DELETE /api/admin/groups/{id}` - Delete group
- `GET /api/admin/logs` - Server logs
- `GET /api/admin/system` - System info
- `POST /api/admin/backup` - Create backup
- `GET /api/admin/backups` - List backups

### Files
- `/app/admin/index.html` - Admin panel SPA
- `/app/backend/server.py` - Admin API endpoints

## Refactoring (Completed 2025-02-22)
Файл `group/[groupId].tsx` был разбит на 12 компонентов в `/app/frontend/src/components/group-chat/`:
- `MessageItem.tsx` - Компонент сообщения (text, image, voice, sticker)
- `MessageMenu.tsx` - Модальное меню действий с сообщением
- `InputToolbar.tsx` - Панель ввода сообщения
- `ReplyBar.tsx` - Превью ответа на сообщение
- `EditBar.tsx` - Панель редактирования сообщения
- `RecordingBar.tsx` - Панель записи голосового сообщения
- `StickerPanel.tsx` - Панель выбора стикеров
- `PinnedMessagesModal.tsx` - Модалка закреплённых сообщений
- `ForwardModal.tsx` - Модалка пересылки сообщений
- `SearchBar.tsx` - Поиск по сообщениям
- `colors.ts` - Единая цветовая схема
- `types.ts` - TypeScript типы для всех компонентов
- `index.ts` - Barrel export

**Результат:** Файл уменьшен с 1064 до ~350 строк (на 67%)

## Architecture
```
/app
├── backend/
│   ├── Dockerfile
│   ├── server.py
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── (tabs)/ - Main tabs (chats, settings)
│   │   ├── auth/ - Login/Register
│   │   ├── chat/ - 1-on-1 chats
│   │   ├── group/ - Group chats
│   │   ├── security/ - PIN lock screens
│   │   └── search.tsx
│   ├── src/
│   │   ├── services/api.ts
│   │   ├── stores/
│   │   └── types/
│   └── assets/
├── docker-compose.yml
└── README.md
```

## Key API Endpoints
- `/api/groups/create` - Create group
- `/api/groups/{id}/manage` - Manage group
- `/api/groups/{id}/messages` - Group messages
- `/api/messages/{id}` - Edit/delete message
- `/api/messages/{id}/pin` - Pin message
- `/api/messages/forward` - Forward message
- `/api/media/upload` - Upload media
- `/api/stickers` - Get sticker packs

## Database Schema
- **users:** `{_id, username, email, password_hash, contacts, last_seen}`
- **groups:** `{_id, name, owner, members, admins, banned_users, pinned_messages}`
- **messages:** `{_id, sender, receiver, content, timestamp, type, status, is_edited...}`
