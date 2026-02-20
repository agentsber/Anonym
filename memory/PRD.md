# Anonym X - Secure Messenger PRD

## Оригинальное описание проекта
Безопасный Android мессенджер с E2E шифрованием.

## Основные функции (запрошенные пользователем)
- [x] Регистрация пользователей (email/пароль)
- [x] Поиск пользователей
- [x] E2E шифрование сообщений
- [x] Статус прочтения ("прочитано")
- [x] Онлайн статус
- [x] Исчезающие сообщения
- [x] Ответ на сообщение
- [x] Редактирование/удаление сообщений
- [x] **Групповые чаты** (ЗАВЕРШЕНО 20.02.2026)
- [ ] Пересылка сообщений (P1)
- [ ] Голосовые сообщения (P2)
- [ ] Стикеры (P2)
- [x] Темная тема

## Архитектура
```
/app
├── backend/
│   ├── server.py       # FastAPI: API endpoints, WebSockets, DB
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── (tabs)/     # Главный экран с чатами
    │   ├── auth/       # Регистрация/вход
    │   ├── chat/       # Индивидуальные чаты
    │   ├── group/      # Групповые чаты
    │   └── create-group.tsx
    └── src/
        ├── services/api.ts
        ├── stores/
        └── types/
```

## Технологический стек
- **Frontend:** React Native (Expo), TypeScript, Zustand
- **Backend:** Python, FastAPI, MongoDB
- **Realtime:** WebSockets

## Групповые чаты - Реализация

### Backend API (`/api/groups`)
- `POST /api/groups` - Создание группы
- `GET /api/groups/{user_id}` - Получить группы пользователя
- `GET /api/groups/{group_id}/info` - Информация о группе
- `PUT /api/groups/{group_id}` - Обновить группу
- `POST /api/groups/{group_id}/members/{member_id}` - Добавить участника
- `DELETE /api/groups/{group_id}/members/{member_id}` - Удалить участника
- `POST /api/groups/{group_id}/messages` - Отправить сообщение
- `GET /api/groups/{group_id}/messages` - Получить сообщения
- `DELETE /api/groups/{group_id}` - Удалить группу

### Frontend Screens
- `create-group.tsx` - UI создания группы
- `group/[groupId].tsx` - Экран группового чата

### Статус тестирования
- Backend: 36/36 тестов пройдено
- Frontend: 85% работает (роутинг исправлен)

## Предстоящие задачи

### P1 - Высокий приоритет
- Пересылка сообщений

### P2 - Средний приоритет
- Голосовые сообщения (expo-av)
- Стикеры

### P3 - Низкий приоритет
- Защита от скриншотов (FLAG_SECURE)
- Удаление данных при неверном PIN
- Certificate Pinning

## Исправленные баги (20.02.2026)
1. `server.py`: Исправлен метод `manager.send_message` -> `manager.send_personal_message`
2. `server.py`: Добавлено исключение `_id` в `get_group_members` для MongoDB сериализации
3. `register.tsx`: Исправлен роутинг `/(app)` -> `/(tabs)`
