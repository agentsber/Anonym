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
- [x] **Групповые чаты** (ЗАВЕРШЕНО)
- [x] **Управление группой** (ЗАВЕРШЕНО)
- [x] **Расширенные групповые чаты** (ЗАВЕРШЕНО)
- [x] **Пересылка сообщений** (ЗАВЕРШЕНО)
- [x] **Голосовые сообщения** (ЗАВЕРШЕНО 22.02.2026)
- [x] **Стикеры** (ЗАВЕРШЕНО 22.02.2026)
- [x] Темная тема

## ВСЕ ОСНОВНЫЕ ФУНКЦИИ РЕАЛИЗОВАНЫ!

## Архитектура
```
/app
├── backend/
│   ├── server.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── group/[groupId].tsx     # Групповой чат
│   │   ├── group-manage/[manageId].tsx  # Управление группой
│   │   └── create-group.tsx
│   └── src/
│       ├── services/api.ts
│       ├── stores/
│       └── types/
├── docker-compose.yml
├── nginx.conf
└── DEPLOY.md
```

## API Endpoints для групповых чатов

### Сообщения
- `POST /api/groups/{id}/messages` - Отправка (с медиа)
- `PUT /api/groups/{id}/messages/{msg_id}` - Редактирование
- `DELETE /api/groups/{id}/messages/{msg_id}` - Удаление
- `GET /api/groups/{id}/messages` - Получение (с поиском)

### Закрепление
- `POST /api/groups/{id}/messages/{msg_id}/pin` - Закрепить
- `DELETE /api/groups/{id}/messages/{msg_id}/pin` - Открепить
- `GET /api/groups/{id}/pinned` - Список закрепленных

### Поиск
- `GET /api/groups/{id}/search?q=query` - Поиск сообщений

### Администраторы
- `PUT /api/groups/{id}/members/{member_id}/role` - Назначить/снять админа

### Блокировка
- `POST /api/groups/{id}/ban/{member_id}` - Заблокировать
- `DELETE /api/groups/{id}/ban/{member_id}` - Разблокировать
- `GET /api/groups/{id}/bans` - Список заблокированных

## Статус тестирования
- Backend: 29/29 тестов для расширенных функций
- Frontend: 85% работает

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
