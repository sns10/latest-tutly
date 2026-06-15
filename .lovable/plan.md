## Problem

On some phones, tapping Present/Absent in the attendance list doesn't reliably register, or the colored state doesn't appear. After auditing the code I found three mobile-specific issues — all in presentation/interaction code, not in the save logic. The existing dedupe / "only mark unmarked" rules stay exactly as they are.

### Root causes

1. **Virtualizer remeasures during the tap** (`src/components/attendance/VirtualizedStudentList.tsx`)
   - Row content (`p-2` + avatar + 2 lines of text + buttons) often renders **taller than the 72px estimate** on small screens.
   - `measureElement` then reports the real height after first paint, the virtualizer recomputes positions, and on iOS/Android any layout shift between `touchstart` and `touchend` cancels the `click`. Result: the user taps "P", nothing happens, no toast, no green.
   - The outer wrapper also forces `height: virtualItem.size` while the inner content can be larger → rows visually overlap and the next row's button intercepts the tap.

2. **Touch targets are too small**
   - P/A/L/E buttons are `h-8 px-2` (~32×26 px). Below the 44px minimum, easy to mistap an adjacent button or miss entirely on cramped phones.
   - No `touch-action: manipulation` on the buttons themselves → iOS Safari can treat fast repeated taps as double-tap-zoom and swallow the second tap.

3. **Toast + cache invalidate fires re-render mid-tap**
   - `handleMarkAttendance` shows a `toast.success` and the mutation's `onSettled` invalidates the whole attendance cache immediately. While the optimistic update paints green correctly, the re-render right after a tap can drop the very next tap on a virtualized row (same mechanism as #1).

## Fix (presentation only — no logic, schema, or save-path changes)

### `src/components/attendance/VirtualizedStudentList.tsx`
- Bump `estimateSize` from 72 → 88 to match actual row height on phones.
- Keep `measureElement` but make the row wrapper a **min-height container** instead of a fixed-height absolute box: use `minHeight: virtualItem.size` and let the row size itself. This stops the overlap / tap-interception when measured height ≠ estimate.
- Add `style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}` to the scroll container so scrolling and tapping stay distinct.

### `src/components/attendance/VirtualizedStudentList.tsx` → `StudentRow`
- Buttons: `h-8 px-2` → `h-10 min-w-[40px] px-2.5` and add `touch-action: manipulation` via `style`. Keeps the same compact P/A/L/E look but gives a 40×40 target.
- Remove `active:scale-95 transition-transform` (the transform during touch is the smallest possible contributor to tap drops; safer to drop it on the list).
- Use `onPointerUp` fallback: keep `onClick` as the primary handler, but also bind `onPointerDown={e => e.stopPropagation()}` on each button so a parent scroll listener can't claim the gesture.

### `src/components/AttendanceTracker.tsx`
- In `handleMarkAttendance`, defer the success toast to the next animation frame (`requestAnimationFrame(() => toast.success(...))`) so the toast mount doesn't run inside the same tick as the optimistic re-render. Pure UX — no behaviour change.
- No changes to `handleBulkAttendance`, `getAttendanceForStudent`, `stats`, or the "only mark unmarked" rule.

### Not changing
- `useAttendanceQuery.ts` (save/upsert/optimistic logic, cache keys, invalidation) — untouched.
- `AttendanceTracker.tsx` filters, smart-detect, stats, copy-from-previous — untouched.
- Database, RLS, RPCs, edge functions — untouched.
- "Mark All Present" behaviour (still scoped to unmarked students) — untouched.

## Verification

1. Open `/attendance` in the preview at mobile width (390×844).
2. Select a class with 10+ students.
3. Rapidly tap P on 5 different rows — every tap should register a green button and a toast.
4. Scroll the list, then tap A — should mark absent without scroll being interpreted as the tap.
5. Tap "Mark All Present" — unmarked count goes to 0, button shows "All Marked".
6. Confirm no duplicate rows are created (query `student_attendance` for `(student_id, date, subject_id, faculty_id)` uniqueness).
