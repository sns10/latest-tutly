

# Code Cleanup: `useSupabaseData` God Hook Refactor

## Assessment — How Messy Is It?

`useSupabaseData.ts` is a **972-line "god hook"** that does everything: student CRUD, XP operations, fee operations, test operations, attendance, challenges, announcements, faculty, subjects, timetable, divisions, and rooms. It returns **40+ functions and data arrays** from a single hook.

### Problems This Causes

1. **Every page re-renders on any data change** — `Index.tsx` destructures all 40+ values from `useSupabaseData()`. Any mutation (e.g. marking attendance) triggers re-computation of the entire hook, causing unnecessary re-renders across unrelated UI sections.

2. **Duplicate logic** — `addStudent` in `useSupabaseData` (lines 103-171) duplicates `useAddStudentMutation` in `useStudentsQuery.ts`. Same for `addWeeklyTest`, `deleteWeeklyTest`, `addFee`, `updateFeeStatus`, `deleteFee`, `updateClassFee`. Both exist and may diverge over time.

3. **No error boundaries per domain** — A single Supabase error in any of the 12+ queries blocks the entire dashboard via the shared `loading` gate.

4. **Massive prop drilling** — `Index.tsx` passes 20+ props to `WeeklyTestManager` and 15+ to `StudentAlertsCard` because `useSupabaseData` centralizes everything at the top.

5. **`any` types everywhere** — `formatAttendance(data: any[])`, `formatFees(data: any[])`, `updateData: any = {}` — no type safety on DB responses.

6. **Inconsistent patterns** — Some operations use React Query mutations (`useMarkAttendanceMutation`), others use raw `async` functions (`addFee`, `updateFeeStatus`). This inconsistency makes it unclear which approach is correct.

## Cleanup Plan

The refactor splits `useSupabaseData` into **domain-specific hooks** that components import directly, eliminating the god hook and prop drilling. Each step is safe and incremental — no behavior changes, just reorganization.

### Step 1: Create Domain Mutation Hooks

Move the raw `async` functions from `useSupabaseData` into proper React Query mutation hooks in their existing query files:

| Domain | Functions to move | Target file |
|--------|------------------|-------------|
| Students | `updateStudent`, `assignStudentEmail`, `assignTeam`, `updateStudentDivision` | `useStudentsQuery.ts` |
| XP/Rewards | `addXp`, `reduceXp`, `awardXP`, `buyReward`, `useReward` | New `useXpQuery.ts` |
| Fees | `addFeesBatch`, `deleteFee`, `fetchFees` | `useFeesQuery.ts` |
| Challenges | `addChallenge`, `completeChallenge` | `useCoreDataQuery.ts` |
| Announcements | `addAnnouncement` | `useCoreDataQuery.ts` |
| Faculty | `addFaculty`, `updateFaculty`, `deleteFaculty` | New `useFacultyMutations.ts` |
| Subjects | `addSubject`, `updateSubject`, `deleteSubject` | New `useSubjectMutations.ts` |
| Timetable | `addTimetableEntry`, `updateTimetableEntry`, `deleteTimetableEntry` | New `useTimetableMutations.ts` |
| Divisions | `addDivision`, `updateDivision`, `deleteDivision` | New `useDivisionMutations.ts` |
| Rooms | `addRoom`, `updateRoom`, `deleteRoom` | New `useRoomMutations.ts` |

Each mutation hook follows the existing pattern: `useMutation` + `queryClient.invalidateQueries` + toast.

### Step 2: Slim Down `useSupabaseData` to a Facade

Keep `useSupabaseData` as a thin wrapper that imports from the domain hooks and re-exports for backward compatibility. This ensures **zero breakage** — all 20+ components that currently import from `useSupabaseData` continue working unchanged.

```text
useSupabaseData() {
  // Queries (unchanged)
  const { data: students } = useStudentsQuery(tuitionId);
  // ...

  // Mutations (now from domain hooks)
  const { mutate: addStudent } = useAddStudentMutation(tuitionId);
  const { mutate: updateStudent } = useUpdateStudentMutation(tuitionId);
  // ...

  return { students, addStudent, updateStudent, ... };
}
```

### Step 3: Update `Index.tsx` — Direct Hook Imports

Replace the massive `useSupabaseData()` destructure in `Index.tsx` with direct domain hook imports. Only import what the dashboard actually needs (students, tests, attendance for alerts). Sub-pages already lazy-load — they can import their own hooks.

### Step 4: Remove Duplicate Functions

Delete the duplicated `addStudent` from `useSupabaseData` (the one with division auto-creation logic) and consolidate into `useAddStudentMutation` in `useStudentsQuery.ts`, preserving the division auto-creation behavior.

### Step 5: Type Safety Pass

Replace `any[]` parameters in `formatAttendance`, `formatFees`, and `updateData` with proper types from `src/integrations/supabase/types.ts` (the auto-generated DB types).

## Impact

- **`useSupabaseData.ts`**: 972 lines → ~100 lines (facade only)
- **New files**: 5-6 small mutation hook files (~50-80 lines each)
- **Modified files**: `useStudentsQuery.ts`, `useFeesQuery.ts`, `useCoreDataQuery.ts`, `Index.tsx`
- **Zero behavior changes** — all existing component imports continue working via the facade
- **Performance gain** — components only subscribe to the data they need

## Risk Mitigation

- Facade pattern means no component needs to change in Step 1-2
- Each domain hook is independently testable
- Incremental: can stop after any step and the app still works

