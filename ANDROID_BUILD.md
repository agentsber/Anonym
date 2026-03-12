# 🤖 Сборка Anonym X APK для Android

## Требования

- Node.js 18+
- Аккаунт Expo (бесплатно): https://expo.dev

---

## Быстрая сборка (через EAS Cloud)

### 1. Скачайте проект

**Вариант A (GitHub):**
```bash
git clone https://github.com/agentsber/anonym.git
cd anonym/frontend
```

**Вариант B (ZIP):**
- Скачайте ZIP с https://github.com/agentsber/anonym
- Распакуйте и перейдите в папку `frontend`

### 2. Установите зависимости

```bash
npm install -g eas-cli
npm install
```

### 3. Войдите в Expo

```bash
eas login
```

### 4. Соберите APK

```powershell
# Windows PowerShell
$env:EAS_NO_VCS=1; eas build -p android --profile preview
```

```bash
# Mac/Linux
EAS_NO_VCS=1 eas build -p android --profile preview
```

### 5. Скачайте APK

После сборки (10-15 мин) вы получите ссылку на скачивание APK.

---

## Конфигурация сервера

URL сервера уже настроен в `eas.json`:
```json
"env": {
  "EXPO_PUBLIC_BACKEND_URL": "http://5.42.101.121:8001"
}
```

**Чтобы изменить на свой сервер:**
1. Откройте `eas.json`
2. Замените `5.42.101.121:8001` на ваш IP/домен
3. Пересоберите APK

---

## Профили сборки

| Профиль | Команда | Результат |
|---------|---------|-----------|
| preview | `eas build -p android --profile preview` | APK для тестирования |
| production | `eas build -p android --profile production` | AAB для Google Play |

---

## Установка APK на устройство

### Вариант 1: Через браузер
1. Откройте ссылку на APK на телефоне
2. Скачайте и установите
3. Разрешите установку из неизвестных источников

### Вариант 2: Через ADB
```bash
adb install anonym-x.apk
```

### Вариант 3: QR-код
После сборки на странице Expo появится QR-код — отсканируйте его камерой телефона.

---

## Решение проблем

### "EAS_NO_VCS" error
```powershell
# Windows
$env:EAS_NO_VCS=1; eas build -p android --profile preview

# Mac/Linux
EAS_NO_VCS=1 eas build -p android --profile preview
```

### "Docker Hub rate limit"
```bash
docker login
# Введите логин/пароль от hub.docker.com
```

### "Gradle build failed"
```bash
# Очистите кэш
eas build -p android --profile preview --clear-cache
```

### "Dependencies conflict"
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Разрешения Android

Приложение запрашивает:

| Разрешение | Для чего |
|------------|----------|
| CAMERA | Фото/видео, видеозвонки |
| RECORD_AUDIO | Голосовые сообщения, звонки |
| READ/WRITE_EXTERNAL_STORAGE | Сохранение медиа |
| USE_BIOMETRIC | Отпечаток пальца |
| VIBRATE | Уведомления |
| INTERNET | Подключение к серверу |
| BLUETOOTH | Bluetooth гарнитура для звонков |

---

## Публикация в Google Play

### 1. Создайте аккаунт разработчика
https://play.google.com/console ($25 единоразово)

### 2. Создайте приложение
- Укажите название: Anonym X
- Package name: com.anonx.message

### 3. Соберите AAB (Android App Bundle)
```bash
EAS_NO_VCS=1 eas build -p android --profile production
```

### 4. Загрузите в Google Play Console
Загрузите файл `.aab` в раздел "Production"

---

## Полезные ссылки

- [Expo Android Builds](https://docs.expo.dev/build/building-android/)
- [Google Play Console](https://play.google.com/console)
- [ADB Installation](https://developer.android.com/tools/adb)
