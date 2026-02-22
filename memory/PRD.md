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
- [ ] **P3** Data Wipe on Incorrect PIN: Track failed PIN attempts and wipe data after threshold
- [ ] **P3** Certificate Pinning: Enhanced security against MITM attacks

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
