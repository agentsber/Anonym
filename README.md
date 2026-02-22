# Anonym X - Защищённый мессенджер

## Описание
Защищённый мессенджер с E2E шифрованием для Android и Web.

## Возможности
- 🔐 E2E шифрование сообщений
- 👥 Личные и групповые чаты
- 🎤 Голосовые сообщения
- 😊 Стикеры
- 📌 Закрепление сообщений
- ↩️ Ответы и пересылка
- ✏️ Редактирование и удаление
- 🔒 PIN-код и биометрия
- 💣 Автоудаление данных
- 🌙 Тёмная тема

---

## 🚀 Быстрый старт (5 минут)

### Требования
- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM, 10GB диска

### Установка

```bash
# 1. Скачайте проект
git clone <repo-url> anonym-x
cd anonym-x

# 2. Настройте окружение
cp .env.example .env
nano .env  # Измените ADMIN_PASSWORD!

# 3. Запустите
./deploy.sh build
./deploy.sh start

# 4. Проверьте
curl http://localhost:8001/health
```

### Доступ
- **API:** http://localhost:8001
- **Admin:** http://localhost/admin
- **Документация API:** http://localhost:8001/docs

---

## 📱 Сборка мобильного приложения (APK)

### Требования
- Node.js 18+
- EAS CLI: `npm install -g eas-cli`
- Аккаунт Expo: https://expo.dev

### Шаги

```bash
cd frontend

# 1. Установите зависимости
yarn install

# 2. Настройте API URL
echo "EXPO_PUBLIC_BACKEND_URL=https://your-server.com" > .env

# 3. Войдите в Expo
eas login

# 4. Соберите APK
eas build -p android --profile preview

# APK будет доступен для скачивания в Expo Dashboard
```

### Локальная сборка (без Expo)
```bash
# Установите Android SDK
cd frontend
npx expo prebuild -p android
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/
```

---

## 🖥️ Деплой на сервер

### Минимальный деплой (без SSL)

```bash
./deploy.sh setup   # Создаст .env
./deploy.sh build   # Соберёт контейнеры
./deploy.sh start   # Запустит всё
```

### Production деплой (с SSL)

```bash
# 1. Настройте домен
nano .env
# DOMAIN=your-domain.com
# ADMIN_PASSWORD=secure_password

# 2. Установите SSL
./deploy.sh ssl

# 3. Раскомментируйте HTTPS в nginx/nginx.conf

# 4. Перезапустите
./deploy.sh restart
```

---

## 🔧 Команды управления

```bash
./deploy.sh start     # Запустить
./deploy.sh stop      # Остановить
./deploy.sh restart   # Перезапустить
./deploy.sh logs      # Смотреть логи
./deploy.sh logs backend  # Логи backend
./deploy.sh status    # Статус сервисов
./deploy.sh backup    # Создать бэкап
./deploy.sh restore <file>  # Восстановить
./deploy.sh update    # Обновить
```

---

## 📁 Структура проекта

```
anonym-x/
├── backend/           # FastAPI сервер
│   ├── server.py      # Основной код
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/          # Expo приложение
│   ├── app/           # Экраны
│   ├── src/           # Компоненты и логика
│   └── Dockerfile
├── admin/             # Веб-админка
│   └── index.html
├── nginx/             # Nginx конфигурация
│   └── nginx.conf
├── docker-compose.yml
├── deploy.sh          # Скрипт деплоя
└── .env.example
```

---

## 🔒 Безопасность

### Рекомендации
1. **Смените пароль админа** в `.env`
2. **Используйте HTTPS** в production
3. **Настройте firewall** - откройте только 80/443
4. **Регулярные бэкапы** - `./deploy.sh backup`

### Переменные окружения
| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| ADMIN_USERNAME | Логин админа | admin |
| ADMIN_PASSWORD | Пароль админа | admin123 |
| MONGO_URL | MongoDB URL | mongodb://mongodb:27017 |
| DB_NAME | Имя базы данных | anonym_x |

---

## 🆘 Решение проблем

### Backend не запускается
```bash
./deploy.sh logs backend
# Проверьте MongoDB
docker-compose exec mongodb mongosh
```

### Нет подключения к MongoDB
```bash
docker-compose ps  # Проверьте статус
docker-compose restart mongodb
```

### Ошибки SSL
```bash
# Проверьте сертификаты
ls -la nginx/ssl/
# Перегенерируйте
./deploy.sh ssl
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `./deploy.sh logs`
2. Проверьте статус: `./deploy.sh status`
3. Создайте issue в репозитории

---

## Лицензия
MIT License
