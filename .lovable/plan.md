## What the video actually shows

When you tap "Mark All Present", the green dots show up almost instantly (optimistic update), but then most students flip back to "unmarked" for several seconds before settling. Yes — attendance does eventually get saved, but the UI lies to you in the middle, and the save itself is genuinely slow. There are two distinct problems stacked on top of each other.

## Root causes

### 1. Bulk save makes N×2 sequential network calls
`useBulkMarkAttendanceMutation` in `src/hooks/queries/useAttendanceQuery.ts` loops `for (const r of records)` with `await` inside, and for **each student** runs:
1. a `SELECT` to check if a row exists, then
2. an `INSERT` or `UPDATE`.

For a class of 40 students that's ~80 serial round trips to the database. On a mobile network this easily takes 10–30 seconds. The single-mark path has the same shape but it's only one student, so you don't notice.

### 2. The refetch immediately overwrites the optimistic green dots
After the mutation settles, `onSettled` calls `queryClient.invalidateQueries({ queryKey: ['attendance', tuitionId] })`. That invalidates **every** attendance cache entry for the tuition (today, 30-day, student details, etc.) and triggers a refetch of the main 30-day window with full pagination. Until that refetch returns, React Query keeps the previous data — but because the previous data was the optimistic snapshot that's now considered stale, in practice the list visibly empties and refills as the bulky 30-day pagination loop completes. That's the "everyone goes unmarked, then comes back" flicker you saw.

### 3. Secondary issue (already partly handled): premature `toast.success`
`handleMarkAttendance` fires success toasts before the mutation resolves. Not the cause of the flicker, but it amplifies user confusion when a save is actually still in-flight.

## Plan — fix slow bulk + flicker without changing the green-only-unmarked rule

### A. One round-trip bulk save via an RPC

Add a SECURITY DEFINER Postgres function `bulk_mark_attendance(_records jsonb)` that:

- Reads each record `{student_id, date, status, notes, subject_id, faculty_id}` from the jsonb array.
- Verifies all `student_id`s belong to the caller's tuition (via `get_user_tuition_id(auth.uid())`) — rejects cross-tenant writes.
- Performs a single `INSERT ... SELECT ... ON CONFLICT (student_attendance_unique_idx) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = now()` against the existing partial unique index that already coalesces null subject/faculty.
- Returns the affected rows so the client can hydrate cache directly.

Front-end change in `useBulkMarkAttendanceMutation`:
- Replace the `for...of` select/insert/update loop with a single `supabase.rpc('bulk_mark_attendance', { _records })` call.
- Keep the existing `onMutate` optimistic snapshot logic exactly as-is (no behaviour change).
- Keep the per-row error tolerance: the RPC returns per-row status so partial failures are still surfaced.

This turns the 80-call loop into 1 call. Save time drops from ~10–30 s to well under a second for a typical class.

### B. Stop the post-save flicker

In `onSettled` for both `useMarkAttendanceMutation` and `useBulkMarkAttendanceMutation`:
- Use `queryClient.invalidateQueries({ queryKey: ['attendance', tuitionId], refetchType: 'none' })` — marks caches stale without triggering an immediate visible refetch.
- Then merge the rows returned by the RPC into the existing caches with `setQueryData`, replacing any `temp-…` ids with real ones. The optimistic green dots stay on screen and become the real data, with no empty/refill cycle.
- A normal background refetch will still happen the next time a query mounts or window regains focus — so the eventual consistency guarantee is preserved.

### C. Small UX tightening (no logic change)

- In `AttendanceTracker.handleMarkAttendance`, move the `toast.success` from a fire-and-forget `requestAnimationFrame` into the mutation's `onSuccess` (returned from the page via the existing `onMarkAttendance` callback), so users never see "Marked present" for a save that ultimately failed.
- Show a single inline saving indicator on the "Mark All Present" button while the RPC is in flight (we already have `isBulkMarking`); no spinner per row.

### Out of scope (deliberately not touching now)

- The 30-day default window in `useAttendanceQuery`, the strict subject/faculty silo in `getAttendanceForStudent`, and the RLS "allow all authenticated" policy. The sub-agents flagged these as separate consistency concerns, but none of them are the cause of the slow/flicker behaviour in this video, and changing them now risks breaking the rules you already locked in ("only mark unmarked", "no cross-subject bleed"). Happy to do them in a follow-up pass.

## Technical summary

- **New migration**: `bulk_mark_attendance(_records jsonb)` RPC, `SECURITY DEFINER`, `search_path = public`, tuition ownership check, single set-based upsert against the existing unique index, returns affected rows.
- **`src/hooks/queries/useAttendanceQuery.ts`**: rewrite `useBulkMarkAttendanceMutation.mutationFn` to call the RPC; change `onSettled` in both mutations to `invalidateQueries({..., refetchType: 'none'})` plus a `setQueryData` merge of real rows.
- **`src/components/AttendanceTracker.tsx`**: defer the per-mark toast to the mutation's `onSuccess` instead of `requestAnimationFrame`. No changes to filter/stats/derivation logic.
- **No schema changes** to `student_attendance` itself; reuses the existing `student_attendance_unique_idx`.

## Expected outcome

- "Mark All Present" for a 40-student class returns in well under 1 s on a normal mobile connection.
- Green dots appear immediately and stay — no temporary "unmarked" flash.
- Attendance is genuinely persisted (verifiable by reloading the page or opening Reports).
- No change to the "only mark unmarked students" rule or to any other behaviour.
