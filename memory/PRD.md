# Private - Secure Android Messenger

## App Name: Private

## Latest Updates (2026-03-14)

### Animation System Added
- **Screen Transitions:** slide_from_right, slide_from_bottom, fade effects
- **List Animations:** Staggered fade-in for chat items (50ms delay per item)
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

### New Animation Components
File: `/app/frontend/src/components/AnimatedComponents.tsx`
- `AnimatedListItem` - Staggered list items with press scale
- `FadeInView` - Fade + translateY entrance
- `ScaleButton` - Spring scale on press
- `PulseView` - Looping pulse animation
- `SlideInView` - Directional slide entrance

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
- [x] **Smooth transition animations**

## Current Version: 18
