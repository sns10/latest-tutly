

# Fix: Wrong Fee/Attendance Data + Remove Leaderboard

## Problem 1: Wrong Fee Due Counts
`formatFees` in `useFeesQuery.ts` returns the raw `status` from the database. If a fee has `status='unpaid'` but its `due_date` has passed, it still shows as "unpaid" instead of "overdue." There is no automatic status update — the DB stores whatever was set at creation. Different devices see different cached states depending on when they last fetched.

**Fix**: In `formatFees`, derive the effective status client-side: if `status` is `unpaid` and `due_date < today`, treat it as `overdue`. This ensures all devices show correct counts regardless of cache timing.

## Problem 2: Wrong Attendance Counts
`useAttendanceQuery` (line 69) uses `.limit(1000)` with no pagination. For a tuition with 100+ students across 5 subjects/day over 30 days, that's potentially 15,000+ records. The 1000 limit silently truncates data, causing the dashboard to show wrong present/absent counts.

**Fix**: Replace `.limit(1000)` with the same pagination loop pattern used in `useFeesQuery` and `useHistoricalAttendanceQuery`. Cap at a reasonable max (e.g., 10,000) for the default 30-day window.

## Problem 3: Remove Leaderboard Feature

Remove all leaderboard UI and routing while keeping the XP/gamification data intact in the database.

### Files to modify:
| File | Change |
|------|--------|
| `src/hooks/queries/useFeesQuery.ts` | Derive overdue status in `formatFees` |
| `src/hooks/queries/useAttendanceQuery.ts` | Replace `.limit(1000)` with pagination loop |
| `src/pages/Index.tsx` | Remove `LeaderboardPage` lazy import and `/leaderboard` route |
| `src/App.tsx` | Remove `Leaderboard` lazy import (if used at top level) |
| `src/components/AppSidebar.tsx` | Remove leaderboard nav item |
| `src/components/BottomNav.tsx` | Remove "Board" nav item |
| `src/pages/Student.tsx` | Remove leaderboard tab + `useStudentLeaderboard` import |
| `src/hooks/useTuitionFeatures.ts` | Remove `'leaderboard'` from `FeatureKey` type and `ALL_FEATURES` |

### Files to delete:
- `src/pages/Leaderboard.tsx`
- `src/components/Leaderboard.tsx`
- `src/components/StudentPortalLeaderboard.tsx`
- `src/hooks/useStudentLeaderboard.ts`

### What stays untouched:
- XP system (`student_xp`, `useXpMutations`) — still used by gamification
- Badges, rewards, challenges — independent features
- `useAttendanceStreak` — used elsewhere

## Risk
- Fee status fix is read-only derivation — no DB changes needed
- Attendance pagination is a proven pattern already used in 3 other queries
- Leaderboard removal is clean — no other feature depends on it

