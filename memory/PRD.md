# Private - Secure Android/iOS Messenger

## App Name: Private

## Latest Updates (2026-03-20)

### Voice Messages - NEW
- Full voice message recording with animated waveform
- Playback with progress indicator
- Backend API for voice message storage (`/api/upload/voice`, `/api/voice/{id}`)
- Duration tracking and display

### Online Status Fix - UPDATED
- Online status now persists to MongoDB database
- `last_seen` properly saved on WebSocket disconnect
- Status checked from DB when user is offline
- User activity tracked via API calls (pending messages polling)

### Previous Updates (2026-03-14)

### Animation System
- **Screen Transitions:** slide_from_right, slide_from_bottom, fade effects
- **List Animations:** Staggered fade-in for chat items (50ms delay per item)
- **Chat Bubble Animations:** Pop-in effect for messages with AnimatedChatBubble component
- **Button Animations:** Scale on press (0.95-1.0)
- **Empty States:** FadeInView with subtle translate

### Design System (Minimalist + Glassmorphism)
```javascript
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

### Animation Components
File: `/app/frontend/src/components/AnimatedComponents.tsx`
- `AnimatedListItem` - Staggered list items with press scale
- `FadeInView` - Fade + translateY entrance
- `ScaleButton` - Spring scale on press
- `PulseView` - Looping pulse animation
- `SlideInView` - Directional slide entrance

File: `/app/frontend/src/components/AnimatedChatBubble.tsx`
- Pop-in animation for chat messages
- Voice message playback with waveform visualization
- Press scale feedback

### Screen Animations (_layout.tsx)
| Screen | Animation | Duration |
|--------|-----------|----------|
| Welcome | fade | 300ms |
| Auth | slide_from_bottom | 300ms |
| Chat | slide_from_right | 250ms |
| Search | modal + slide_from_bottom | - |
| Video Record | slide_from_bottom | 300ms |
| Video Call | fullScreenModal + fade | - |

## Core Features
- [x] E2E encrypted messaging
- [x] Video/Audio Calls (WebRTC)
- [x] Video Feed (Reels) with Editor
- [x] Push & Local Notifications
- [x] Performance optimization (MongoDB indexes)
- [x] Minimalist + Glassmorphism design
- [x] Smooth transition animations
- [x] Chat bubble animations
- [x] **Voice messages with recording/playback**
- [x] **Fixed online status tracking**

## Pending Verification
- [ ] Profile editing (implemented, needs user testing)
- [ ] Login/Registration buttons (implemented, needs user testing)
- [ ] Video/Audio calls end-to-end test
- [ ] Admin panel on user's server

## Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main API (3000+ lines, needs refactoring)
- MongoDB collections: users, messages, contacts, groups, videos, voice_messages

### Frontend (Expo/React Native)
- `/app/frontend/app/` - Screens using expo-router
- `/app/frontend/src/components/` - Reusable components
- `/app/frontend/src/stores/` - Zustand state management
- `/app/frontend/src/services/` - API clients

### Key APIs
- Auth: `/api/auth/register`, `/api/auth/login`
- Users: `/api/users/{id}`, `/api/users/{id}/status`, `/api/users/{id}/profile`
- Messages: `/api/messages/send`, `/api/messages/pending/{userId}`
- Voice: `/api/upload/voice`, `/api/voice/{fileId}`
- Videos: `/api/videos/upload`, `/api/videos/feed/{userId}`

## Current Version: 19
