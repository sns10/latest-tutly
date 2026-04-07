

# Fix: App Hanging After WhatsApp Share

## Problem
When users tap "Share to WhatsApp", the browser opens WhatsApp via `window.open(url, '_blank')`. On mobile devices (especially Android), this backgrounds the browser tab. When the user returns:

1. **No app shell caching** — The service worker only handles push notifications, with no `fetch` handler. The browser must re-download all JS/CSS from network on every return visit.
2. **Heavy dashboard re-initialization** — `Index.tsx` fires 12+ parallel Supabase queries (students, tests, attendance, fees, timetable, challenges, etc.) simultaneously on mount.
3. **30-second polling interval** — `useAttendanceNotification` runs `setInterval` every 30 seconds, iterating over all timetable entries and attendance records each time.

## Fix Plan

### Step 1: Add App Shell Caching to Service Worker
Update `public/sw.js` to add a `fetch` event handler with a **cache-first** strategy for static assets (JS, CSS, fonts, images) and **network-first** for API calls. This means returning from WhatsApp loads the cached app instantly instead of waiting for network.

- Cache name versioned (e.g., `tutly-shell-v1`) for easy invalidation
- Only cache same-origin requests
- Exclude Supabase API calls from caching
- Pre-cache the app shell on `install`

### Step 2: Memoize `isFeatureEnabled` 
In `src/hooks/useTuitionFeatures.ts`, wrap `isFeatureEnabled` in `useCallback` to prevent unnecessary re-renders of all components that receive it as a prop.

### Step 3: Add `React.memo` to Heavy Dashboard Components
Wrap these components to prevent re-renders when unrelated state changes (like the `copied` toggle or attendance notification state):
- `DailySummaryCard`
- `ManagementCards`
- `RecentTests`
- `StudentAlertsCard`

### Step 4: Throttle Attendance Notification Check
Change the interval in `useAttendanceNotification` from 30 seconds to 60 seconds — checking every 30s is excessive for a 5-15 minute notification window. Also add a `document.visibilityState` check so the interval doesn't fire while the tab is backgrounded (in WhatsApp).

## Files Modified

| File | Change |
|------|--------|
| `public/sw.js` | Add fetch handler with cache-first for static assets |
| `src/hooks/useTuitionFeatures.ts` | Memoize `isFeatureEnabled` with `useCallback` |
| `src/hooks/useAttendanceNotification.ts` | Throttle to 60s, skip when tab hidden |
| `src/components/DailySummaryCard.tsx` | Wrap export in `React.memo` |
| `src/components/ManagementCards.tsx` | Wrap export in `React.memo` |
| `src/components/RecentTests.tsx` | Wrap export in `React.memo` |
| `src/components/StudentAlertsCard.tsx` | Wrap export in `React.memo` |

