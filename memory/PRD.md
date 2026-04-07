# Private - Secure Android/iOS Messenger

## App Name: Private

## Latest Updates (2026-04-07)

### WebRTC Video/Audio Calls - FIXED
- Fixed platform-specific WebRTC implementation
- Created `webrtc.web.ts` for web platform using browser native APIs
- Created `react-native-webrtc` mock for web bundle
- Updated `video-call.tsx` with `RTCView` component for native
- Backend call APIs working: initiate, answer, ice-candidate, end
- Schema fix: offer/answer/candidate now accept strings (JSON-stringified SDP)
- Metro config updated with platform-specific module resolution

### Backend Modular Architecture
The backend was previously refactored from 3000+ line monolith to:
- `/app/backend/routes/` - Modular API routers (auth, users, messages, calls, videos, etc.)
- `/app/backend/models/schemas.py` - Pydantic models
- `/app/backend/utils/` - Database and WebSocket utilities
- `/app/backend/server.py` - 115 lines, clean entry point

## Previous Updates (2026-03-20)

### Voice Messages
- Full voice message recording with animated waveform
- Playback with progress indicator
- Backend API for voice message storage

### Online Status Fix
- Online status persists to MongoDB
- `last_seen` saved on WebSocket disconnect

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
- [x] Video/Audio Calls (WebRTC) - BACKEND TESTED, NEEDS DEVICE TESTING
- [x] Video Feed (Reels) with Editor
- [x] Push & Local Notifications (needs FCM setup)
- [x] Performance optimization (MongoDB indexes)
- [x] Minimalist + Glassmorphism design
- [x] Smooth transition animations
- [x] Chat bubble animations
- [x] Voice messages with recording/playback
- [x] Fixed online status tracking
- [x] Swipe-to-delete chats
- [x] Saved messages / Избранное
- [x] Active sessions / Devices management

## Pending Verification
- [ ] Video/Audio calls end-to-end test on DEVICE (requires two accounts)
- [ ] Profile editing (implemented, needs user testing)
- [ ] Update user's server code (5.42.101.121)

## Blocked / Requires User Input
- [ ] Push notifications (needs Firebase google-services.json)
- [ ] Admin panel on user's physical server

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
