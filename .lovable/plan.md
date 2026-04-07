

# Post-Refactor Analysis & Next Refinements

## Refactor Status: No Errors Found

The domain mutation hooks are correctly implemented. No runtime errors, no type errors. The facade pattern works — all 12 components importing `useSupabaseData` continue functioning.

## Remaining Issues

### Issue 1: Facade still causes global re-renders (HIGH IMPACT)
`useSupabaseData()` instantiates ALL 14 queries + ALL 20 mutation hooks on every call. Every page that imports it (Index, Students, Fees, Attendance, Timetable, Classes, Tests, 4 report components) subscribes to every query. When attendance is marked, the Fees page re-renders. When a fee is added, the Timetable page re-renders.

This is the original performance problem — the refactor moved mutation logic out but didn't decouple the query subscriptions.

### Issue 2: Raw async functions still in facade (250+ lines)
Tests (`addWeeklyTest`, `deleteWeeklyTest`, `addTestResult`, `addTestResultsBatch`) and Fees (`addFee`, `updateFeeStatus`, `updateClassFee`, `deleteFee`) are still raw `async` functions with inline Supabase calls — not React Query mutations. These bypass error retry, optimistic updates, and deduplication.

### Issue 3: Duplicate `addStudent` logic
`useSupabaseData.addStudent` (lines 155-198) has division auto-creation + roll number auto-assignment logic that `useAddStudentMutation` in `useStudentsQuery.ts` does NOT have. If a component imports the mutation directly, it would skip these.

## Refinement Plan

### Step 1: Extract Test & Fee mutations into domain hooks
Move the 4 raw test functions into `useTestsQuery.ts` as proper `useMutation` hooks and the 4 raw fee functions into `useFeesQuery.ts`. This eliminates the last raw Supabase calls from the facade.

### Step 2: Consolidate `addStudent` logic
Move the division auto-creation + roll number auto-assignment into `useAddStudentMutation` in `useStudentsQuery.ts` so the mutation hook is the single source of truth.

### Step 3: Update sub-pages to import domain hooks directly
Replace `useSupabaseData()` in each page with targeted imports:
- `Fees.tsx` → `useStudentsQuery`, `useFeesQuery`, `useClassFeesQuery`, fee mutation hooks
- `Attendance.tsx` → `useStudentsQuery`, `useAttendanceQuery`, attendance mutation hooks
- `Timetable.tsx` → domain hooks for timetable, rooms, subjects, faculty, divisions
- `Classes.tsx` → division, subject, faculty hooks
- `Tests.tsx` → student, test, XP hooks
- `Students.tsx` → student, attendance, test, fee, XP hooks
- Report components → only the read queries they need

This means each page only subscribes to its own data, eliminating cross-domain re-renders.

### Step 4: Slim `useSupabaseData` to near-empty or delete
After all consumers are migrated, the facade either becomes unused (delete it) or stays as a thin 30-line re-export for any remaining edge cases.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/queries/useTestsQuery.ts` | Add mutation hooks for add/delete test, add/batch test results |
| `src/hooks/queries/useFeesQuery.ts` | Add mutation hooks for addFee, updateFeeStatus, updateClassFee, deleteFee |
| `src/hooks/queries/useStudentsQuery.ts` | Move division auto-creation + roll number logic into `useAddStudentMutation` |
| `src/pages/Fees.tsx` | Import domain hooks directly |
| `src/pages/Attendance.tsx` | Import domain hooks directly |
| `src/pages/Timetable.tsx` | Import domain hooks directly |
| `src/pages/Classes.tsx` | Import domain hooks directly |
| `src/pages/Tests.tsx` | Import domain hooks directly |
| `src/pages/Students.tsx` | Import domain hooks directly |
| `src/pages/Index.tsx` | Import domain hooks directly |
| `src/components/reports/*.tsx` | Import only needed queries |
| `src/hooks/useSupabaseData.ts` | Delete or reduce to ~10 lines |
| `src/hooks/queries/index.ts` | Export new mutation hooks |

## Risk Mitigation
- Each page migration is independent — can be done one at a time
- Types stay the same, only import paths change
- If any component still needs the facade, it keeps working until fully migrated

