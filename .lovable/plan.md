## Problem identified

`Mark All Present` is likely failing visually for two reasons in the current attendance screen:

1. **Bulk action only marks “unmarked” students**
   - If a student already has an attendance row as `absent`, `late`, or `excused`, `Mark All Present` skips them.
   - So the button can look like it should make everyone present, but it only fills blank rows and does not convert existing absentees to present.

2. **Stats use stricter matching than row display**
   - Row display has a fallback that shows general attendance when subject/faculty is selected.
   - The summary counts still only count exact subject/faculty matches.
   - Result: rows may show marked, but counters still show unmarked/present incorrectly, especially after subject/faculty changes or auto-detection.

3. **Bulk save only shows final success/failure after backend response**
   - On iPhone/low network, the UI can feel like nothing happened while saving, or a stale refetch can make the action appear unreliable.

## Fix plan

### 1. Make `Mark All Present` actually set all visible students to present
- Change the bulk action behavior from “only blank students” to “all visible students who are not already present”.
- This means:
  - blank → present
  - absent → present
  - late → present
  - excused → present
  - already present → skipped

### 2. Rename/count the button honestly
- Button count will represent students that will change to present, not only unmarked students.
- Example labels:
  - `Mark All Present (56)` when 56 students will change
  - `All Present` when every visible student is already present
  - `Saving…` while the bulk mutation is running

### 3. Fix attendance summary counting
- Make stats use the same lookup logic as student rows (`getAttendanceForStudent`) instead of separately filtering attendance records.
- This keeps `Present / Absent / Late / Unmarked` aligned with what the rows actually show.

### 4. Improve bulk-save feedback
- Show an immediate saving toast/message for bulk actions.
- Keep the existing final `X students saved` success toast from the mutation.
- Prevent duplicate taps while saving using the existing `isBulkMarking` disabled state.

### 5. Keep backend unchanged
- No database/RPC changes are needed.
- The existing bulk RPC already supports upsert/update; the bug is in frontend selection/counting logic.

## Files to update

- `src/components/AttendanceTracker.tsx`
  - Bulk selection logic
  - Button count/label
  - Stats calculation
  - Immediate saving feedback

No changes to database policies, functions, or table schema.