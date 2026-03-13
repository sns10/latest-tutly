

# Cloud Usage Optimization Plan

## Problem Analysis

After auditing all data-fetching hooks, here are the **root causes** of high cloud usage:

### 1. Triple-Querying the Tuitions Table
Three separate hooks each make their own API call to the `tuitions` table on every page load:
- `useTuitionInfo` — fetches name, email, logo, etc.
- `useTuitionFeatures` — fetches features column
- `useTuitionStatus` — fetches is_active, subscription_status

**Impact**: 3 API calls that could be 1.

### 2. No Caching on Critical Hooks (useEffect-based)
These hooks use raw `useEffect` + `useState` instead of React Query, so they have **zero caching** and re-fetch on every component mount/navigation:
- `useUserRole` — fetches role from `user_roles` every mount
- `useTuitionFeatures` — fetches features every mount  
- `useTuitionStatus` — fetches status every mount
- `ProtectedRoute` portal check — queries `tuitions` every mount

**Impact**: 4 uncached API calls fire on every single page navigation.

### 3. Dashboard Loads Everything Eagerly
`useSupabaseData()` in `Index.tsx` fires **~14 parallel queries** on dashboard load — including data for pages the user hasn't visited (challenges, studentChallenges, announcements, rooms, timetable, fees, attendance, test results).

**Impact**: ~14 API calls on initial load, many unnecessary.

### 4. Fees/Attendance Fetched Without Date Scope on Dashboard
The default `useFeesQuery` fetches up to 500 fee records and `useAttendanceQuery` fetches 30 days — both load on the dashboard even though the dashboard only needs today's summary counts.

---

## Proposed Fixes

### Fix 1: Consolidate Tuitions Queries (3 calls → 1)
Create a single `useTuitionData` hook using React Query that fetches all needed tuition fields in one call. Have `useTuitionInfo`, `useTuitionFeatures`, and `useTuitionStatus` derive from this shared cached query.

- **Saves**: 2 API calls per page load
- **Risk**: None — same data, just consolidated

### Fix 2: Convert useEffect Hooks to React Query
Convert `useUserRole`, `useTuitionFeatures`, `useTuitionStatus`, and the portal user check to use React Query with proper `staleTime` (30 min for role/features, 15 min for status).

- **Saves**: 3-4 redundant API calls on every navigation
- **Risk**: None — behavior is identical, just cached

### Fix 3: Lazy-Load Non-Essential Dashboard Data
Split `useSupabaseData` so the dashboard only fetches what it actually renders:
- **Always fetch**: students, divisions, subjects, faculty, weeklyTests, testResults
- **Defer to page visit**: challenges, studentChallenges, announcements, rooms, timetable (these are only needed on their respective pages)
- Attendance and fees on dashboard: only fetch today's date for summary, not full history

- **Saves**: ~5-6 API calls on dashboard load
- **Risk**: Low — data loads when the user navigates to that page

### Fix 4: Increase Global Default staleTime
Raise QueryClient default `staleTime` from 2 minutes to 5 minutes to match the hook-level settings and prevent unexpected background refetches.

- **Saves**: Prevents re-fetch cycles from mismatched cache settings
- **Risk**: None

---

## Summary of Impact

```text
Current dashboard load:   ~20 API calls
After optimization:       ~8-10 API calls (50% reduction)

Per-navigation overhead:  ~7 uncached calls → 0 (all cached)
```

### Files to Modify
- `src/hooks/useUserRole.ts` — convert to React Query
- `src/hooks/useTuitionFeatures.ts` — derive from shared tuition query
- `src/hooks/useTuitionStatus.ts` — derive from shared tuition query
- `src/hooks/useTuitionInfo.ts` — consolidate into shared query
- `src/components/ProtectedRoute.tsx` — cache portal user check
- `src/hooks/useSupabaseData.ts` — split eager vs lazy data
- `src/App.tsx` — increase default staleTime

### Files NOT Modified
All UI components, pages, edge functions, and database schema remain untouched.

