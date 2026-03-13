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
- [x] Admin Panel with Server Management

## Admin Panel Features (Updated 2026-03-13)
- **Обзор**: статистика пользователей, групп, сообщений, активность за 7 дней
- **Пользователи**: просмотр, бан/разбан, удаление
- **Группы**: просмотр, удаление
- **Логи**: серверные логи в реальном времени
- **Система**:
  - Мониторинг CPU, RAM, диска
  - Очистка кэша (GC, pycache, temp files)
  - Очистка БД (токены, сообщения, орфаны)
  - Сжатие БД (compact collections)
  - Информация о сервере (платформа, Python, hostname)
  - Резервные копии (создание, список)

## Admin Panel Access
- **URL:** `https://your-server/api/admin-panel`
- **Default credentials:** `admin` / `admin123`
- **Environment variables:** `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## API Endpoints - Server Management
- `POST /api/admin/server/clear-cache` - Очистка кэша
- `POST /api/admin/server/cleanup-db` - Очистка БД
- `GET /api/admin/server/processes` - Процессы сервера
- `GET /api/admin/server/connections` - Сетевые подключения
- `GET /api/admin/server/uptime` - Аптайм сервера
- `GET /api/admin/db/stats` - Статистика БД
- `POST /api/admin/db/compact` - Сжатие БД

## Dependency Fix (2026-03-13)
Downgraded to **Expo SDK 51** for stable builds:
- `expo@~51.0.0`, `react@18.2.0`, `react-native@0.74.5`
- `expo-modules-core@1.12.26` (compiled JS)

## Future Tasks (Backlog)
- [ ] **P0** Test Video Calls on mobile device
- [ ] **P2** Screenshot Protection (FLAG_SECURE)
- [ ] **P2** iOS build and testing
- [ ] **P3** Message search in admin panel
- [ ] **P3** User editing in admin panel

## Database Collections
- users (69), messages (25), groups (4), group_messages (10)
- contacts (15), group_members (7), media (1), group_bans (0)
