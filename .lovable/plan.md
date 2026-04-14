

# Fix: Inconsistent Data Display Across Devices

## Investigation Results

Database verification confirms the data is **correct**: student "Aazim Saheer" has exactly 7 attendance records (all present, unique dates) and 1 fee of ₹1500 (status: unpaid, due: 2026-04-04).

The problem is **not in the database** — it's in how different views compute and display data.

## Issues Found

### Issue 1: Student Portal fees don't derive "overdue" status
`useStudentData.ts` returns raw `status` from the database. The overdue derivation fix (if `unpaid` + `due_date` passed → show as `overdue`) was only applied in `useFeesQuery.ts` (admin side). The Student Portal still shows these as "unpaid" instead of "overdue", causing inconsistency between what admin sees vs what the student portal shows.

**Fix**: Apply the same overdue derivation in `useStudentData.ts` after fetching fees (around line 218).

### Issue 2: Student Portal has no query pagination
All queries in `useStudentData.ts` use raw Supabase calls with no `.range()` — Supabase silently caps at 1000 rows. While current data volumes are small, `weekly_tests` for the whole tuition could grow past 1000. More critically, if a tuition admin views the shared portal, the `students` query (line 68-72) for a tuition with 163+ students is fine now but will silently truncate at 1000.

**Fix**: Add pagination loops for attendance, tests, and fees queries in `useStudentData.ts`.

### Issue 3: `useStudentAttendanceQuery` (admin student details) has no pagination
Line 207-212 in `useAttendanceQuery.ts` — single query with no `.range()`, will silently cap at 1000 rows for long-term students.

**Fix**: Add pagination loop matching the pattern used in other queries.

### Issue 4: Stale cache across devices
React Query `staleTime` is 5-10 minutes. Different devices cache data at different times, so after an admin updates attendance or fees, another device might show old numbers until cache expires.

**Fix**: No code change needed — this is expected behavior. But the overdue derivation fix ensures at least fee statuses are computed consistently regardless of when data was fetched.

## Changes

| File | Change |
|------|--------|
| `src/hooks/useStudentData.ts` | Add overdue fee derivation + pagination loops for all queries |
| `src/hooks/queries/useAttendanceQuery.ts` | Add pagination to `useStudentAttendanceQuery` |

## What stays untouched
- All admin-side queries (already have pagination + overdue derivation)
- Database schema and data
- XP/gamification system

## Risk
- Low: pagination is a proven pattern, overdue derivation is read-only
- No API changes — hooks return the same shape

