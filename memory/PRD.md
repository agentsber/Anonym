# Private - Secure Android Messenger

## App Name: Private (previously Anonym X)

## Design Update (2026-03-14)
- **Style:** Минималистичный (как Telegram) + Glassmorphism
- **Colors:** Фиолетовый акцент (#6C5CE7), чёрный фон (#000000)
- **Effects:** Прозрачные surfaces, gradient orbs, subtle borders

### Updated Screens
- Welcome screen - gradient logo, glass feature cards
- Auth (Login/Register) - clean minimal form with gradient button
- Tabs navigation - active icon highlight
- Settings - updated colors
- Reels - updated colors

### Design System
```
COLORS = {
  background: '#000000',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.08)',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5B4AD1',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
}
```

## Core Features
- [x] E2E encrypted messaging
- [x] Video/Audio Calls (WebRTC)
- [x] Video Feed (Reels) with Editor
- [x] Push & Local Notifications
- [x] Performance optimization (MongoDB indexes)
- [x] New minimal design with glassmorphism

## Current Version: 17

## Files Changed
- `app/index.tsx` - New welcome screen
- `app/auth/register.tsx` - New auth screen
- `app/(tabs)/_layout.tsx` - New tab design
- `app/(tabs)/settings.tsx` - Updated colors
- `app/(tabs)/reels.tsx` - Updated colors
- `app/(tabs)/index.tsx` - Updated colors
