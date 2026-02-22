# 🚀 Развертывание Anonym X на своем сервере

## Требования к серверу
- **ОС:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM:** минимум 2GB
- **Диск:** минимум 10GB свободного места
- **Docker:** 20.10+
- **Docker Compose:** 2.0+

---

## 📦 Быстрый старт (5 минут)

### Шаг 1: Скачайте проект
Нажмите **"Download Code"** в Emergent и распакуйте на сервере.

### Шаг 2: Установите Docker (если не установлен)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Перелогиньтесь для применения изменений
```

### Шаг 3: Настройте окружение
```bash
cd anonym-x  # или папка с проектом

# Создайте .env файл
cp .env.example .env

# Отредактируйте настройки (ОБЯЗАТЕЛЬНО смените пароль!)
nano .env
```

Пример `.env`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ваш_надежный_пароль
DOMAIN=your-domain.com
JWT_SECRET=случайная_строка_32_символа
```

### Шаг 4: Запустите приложение
```bash
# Дайте права на скрипт
chmod +x deploy.sh

# Соберите и запустите
./deploy.sh build
./deploy.sh start
```

### Шаг 5: Проверьте работу
```bash
# Проверка здоровья
curl http://localhost:8001/health
# Должен вернуть: {"status":"healthy"}

# Проверка статуса контейнеров
./deploy.sh status
```

**Готово!** Сервер доступен:
- **API:** http://ваш_ip:8001
- **Админ-панель:** http://ваш_ip/admin

---

## 🔒 Production деплой с SSL

### Вариант A: Let's Encrypt (бесплатно)

#### 1. Настройте домен
Убедитесь, что ваш домен указывает на IP сервера (A-запись в DNS).

#### 2. Обновите .env
```bash
nano .env
# Добавьте:
DOMAIN=your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com
```

#### 3. Получите SSL сертификат
```bash
./deploy.sh ssl
```

#### 4. Включите HTTPS в nginx
```bash
nano nginx/nginx.conf
# Раскомментируйте секцию "HTTPS server" в конце файла
# Замените your-domain.com на ваш домен
```

#### 5. Перезапустите
```bash
./deploy.sh restart
```

### Вариант B: Свой сертификат

```bash
# Создайте папку для сертификатов
mkdir -p nginx/ssl

# Скопируйте сертификаты
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/

# Включите HTTPS в nginx.conf и перезапустите
./deploy.sh restart
```

---

## 📱 Сборка APK для вашего сервера

### Требования
- Node.js 18+
- EAS CLI: `npm install -g eas-cli`
- Аккаунт Expo (бесплатно): https://expo.dev

### Шаги сборки

#### 1. Настройте URL сервера
```bash
cd frontend

# Создайте .env файл
cp .env.prod.example .env

# Укажите URL вашего сервера
nano .env
# EXPO_PUBLIC_BACKEND_URL=https://your-domain.com
```

#### 2. Войдите в Expo
```bash
eas login
```

#### 3. Соберите APK
```bash
# Preview сборка (для тестирования)
eas build -p android --profile preview

# Production сборка (для публикации)
eas build -p android --profile production
```

APK будет доступен для скачивания в [Expo Dashboard](https://expo.dev).

### Локальная сборка (без Expo Cloud)
```bash
cd frontend
npx expo prebuild -p android
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔧 Команды управления

```bash
./deploy.sh setup     # Начальная настройка
./deploy.sh build     # Сборка контейнеров
./deploy.sh start     # Запуск сервисов
./deploy.sh stop      # Остановка сервисов
./deploy.sh restart   # Перезапуск
./deploy.sh logs      # Просмотр всех логов
./deploy.sh logs backend  # Логи только backend
./deploy.sh status    # Статус сервисов
./deploy.sh backup    # Создать бэкап БД
./deploy.sh restore <file>  # Восстановить из бэкапа
./deploy.sh update    # Обновить приложение
./deploy.sh ssl       # Установить SSL сертификат
```

---

## 🗂 Структура проекта

```
anonym-x/
├── backend/              # FastAPI сервер
│   ├── server.py         # Основной код
│   ├── requirements.txt  # Python зависимости
│   ├── Dockerfile
│   └── .env.prod.example
├── frontend/             # Expo приложение
│   ├── app/              # Экраны
│   ├── src/              # Компоненты и логика
│   └── .env.prod.example
├── admin/                # Веб админ-панель
│   └── index.html
├── nginx/                # Nginx конфигурация
│   ├── nginx.conf
│   └── ssl/              # SSL сертификаты
├── backups/              # Бэкапы MongoDB
├── docker-compose.yml    # Development
├── docker-compose.prod.yml # Production
├── deploy.sh             # Скрипт деплоя
├── .env.example
└── README.md
```

---

## 🌐 Порты

| Порт | Сервис | Описание |
|------|--------|----------|
| 80   | Nginx  | HTTP (редирект на HTTPS) |
| 443  | Nginx  | HTTPS |
| 8001 | Backend | API (внутренний) |
| 27017 | MongoDB | База данных (внутренний) |

⚠️ В production MongoDB и Backend не должны быть доступны извне!

---

## 💾 Резервное копирование

### Автоматический бэкап
```bash
# Добавьте в crontab (ежедневно в 3:00)
crontab -e
0 3 * * * cd /path/to/anonym-x && ./deploy.sh backup
```

### Ручной бэкап
```bash
./deploy.sh backup
# Файл: backups/mongodb_backup_YYYYMMDD_HHMMSS.gz
```

### Восстановление
```bash
./deploy.sh restore backups/mongodb_backup_20231201_030000.gz
```

---

## 🔐 Безопасность

### Рекомендации
1. ✅ **Смените пароль админа** в `.env`
2. ✅ **Используйте HTTPS** в production
3. ✅ **Настройте firewall** - откройте только порты 80 и 443
4. ✅ **Регулярные бэкапы** - настройте автоматический бэкап
5. ✅ **Обновляйте Docker образы** - периодически обновляйте

### Настройка Firewall (UFW)
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 🆘 Решение проблем

### Backend не запускается
```bash
./deploy.sh logs backend
# Проверьте ошибки подключения к MongoDB
```

### MongoDB не работает
```bash
docker-compose ps
docker-compose restart mongodb
```

### Ошибки SSL
```bash
# Проверьте сертификаты
ls -la nginx/ssl/

# Перегенерируйте
./deploy.sh ssl
```

### Очистка и пересборка
```bash
./deploy.sh stop
docker system prune -a
./deploy.sh build
./deploy.sh start
```

---

## 📞 Контакты

При возникновении проблем:
1. Проверьте логи: `./deploy.sh logs`
2. Проверьте статус: `./deploy.sh status`
3. Создайте issue в репозитории

---

## Лицензия
MIT License
