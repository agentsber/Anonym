# 🐳 Развертывание Anonym X на своем сервере

## Быстрый старт (Docker)

### 1. Скачайте проект
Нажмите **"Download Code"** в Emergent

### 2. Установите Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3. Запустите приложение
```bash
# Базовый запуск (backend + MongoDB)
docker-compose up -d

# С Nginx (для production)
docker-compose --profile production up -d
```

### 4. Проверьте работу
```bash
curl http://localhost:8001/health
# Должен вернуть: {"status":"healthy"}
```

---

## Настройка для Production

### Шаг 1: Настройте домен
Укажите ваш домен в `nginx.conf`:
```nginx
server_name your-domain.com;
```

### Шаг 2: Добавьте SSL сертификат
```bash
# Создайте папку для сертификатов
mkdir ssl

# Скопируйте сертификаты
cp /path/to/fullchain.pem ssl/
cp /path/to/privkey.pem ssl/
```

### Шаг 3: Раскомментируйте HTTPS в nginx.conf
Откройте `nginx.conf` и раскомментируйте секцию HTTPS сервера.

### Шаг 4: Запустите с Nginx
```bash
docker-compose --profile production up -d
```

---

## Сборка APK с вашим сервером

### 1. Измените URL в frontend/.env
```
EXPO_PUBLIC_BACKEND_URL=https://your-domain.com
```

### 2. Или измените в frontend/src/services/api.ts
```typescript
const API_URL = 'https://your-domain.com';
```

### 3. Соберите APK
```bash
cd frontend
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

---

## Команды Docker

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f backend

# Перезапуск
docker-compose restart

# Пересборка после изменений
docker-compose up -d --build
```

---

## Структура файлов
```
/app
├── docker-compose.yml    # Главный файл конфигурации
├── nginx.conf            # Конфигурация Nginx
├── backend/
│   ├── Dockerfile        # Сборка backend
│   ├── server.py
│   └── requirements.txt
└── frontend/
    └── ...               # Expo приложение
```

---

## Порты
- **8001** - Backend API
- **27017** - MongoDB
- **80/443** - Nginx (production)

---

## Резервное копирование данных
```bash
# Создать бэкап MongoDB
docker exec anonym_x_db mongodump --out /data/backup

# Восстановить из бэкапа
docker exec anonym_x_db mongorestore /data/backup
```
