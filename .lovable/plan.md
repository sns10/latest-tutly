## Plan

### Goal
Fix the attendance issue where marking attendance does not reliably show the green present state, while keeping the current bulk behavior exactly as you want: **Mark All Present should only mark students who are still unmarked**.

### What I’ll change
1. **Keep the current bulk rule unchanged**
   - Preserve the existing behavior that bulk marking only targets students with no attendance yet in the current session.
   - Avoid changing it into an overwrite-all action.

2. **Harden the attendance save flow**
   - Update the attendance mutations so they resolve existing rows safely and deterministically before writing.
   - Prevent one bad row from breaking the whole bulk action.
   - Ensure the UI reconciles with the backend after save so stale state does not hide the green present state.

3. **Fix the attendance lookup/render logic in the tracker**
   - Tighten the current-session lookup used by the row buttons so the green state is derived from the exact saved session context.
   - Remove cases where a save succeeds but the row still appears unmarked because the UI is matching the wrong record shape.
   - Keep the subject/faculty session separation intact so one class session never bleeds into another.

4. **Improve bulk action feedback without changing scope**
   - Make the bulk action reflect only the students it can actually mark.
   - Add proper pending/disabled handling during bulk save so repeated taps do not create inconsistent UI behavior.

### Technical details
- Files likely to update:
  - `src/components/AttendanceTracker.tsx`
  - `src/hooks/queries/useAttendanceQuery.ts`
  - `src/pages/Attendance.tsx` only if mutation loading state needs to be passed through
- I will **not** loosen data consistency rules or reintroduce duplicate attendance rows.
- The database already has a normalized uniqueness guard for attendance sessions, so I’ll prefer a code fix first and avoid unnecessary schema changes.

### Validation
After implementing, I’ll verify:
- individual present marking turns green immediately
- bulk present marks only previously unmarked students
- existing marked absent/late/excused students are not overwritten
- a refresh still shows the same attendance state
- no duplicate session rows are created