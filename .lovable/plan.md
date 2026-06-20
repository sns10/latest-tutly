## What the video actually shows

The status bar shows an **active phone call** (`10:07 📞`) and a Reliance Jio low-signal indicator. The user repeatedly marks attendance — counts stay frozen at `Present (0) / Unmarked (56)`, individual P/A buttons briefly turn green/red then revert to blank after ~1 s, and even after `56 students saved` toast the page still says `Unmarked (56)`.

This is **not** an `ON CONFLICT` / RPC failure (we verified that last turn). The saves ARE persisting — they're just being visually wiped a moment later.

## Root cause

Three things stack up only on iPhone Safari and low-bandwidth Android with an ongoing call:

1. **`refetchOnReconnect: true`** (set in `src/App.tsx`). iPhone Safari briefly suspends the tab when the in-call banner appears and again when it disappears; weak 4G/VoLTE drops momentarily on every voice packet burst. Each transition fires a full attendance refetch.
2. **`useAttendanceQuery` is a paginated 30-day window** — on a low-network link the refetch takes 5–30 s. The queryFn snapshot was started *before* the just-saved row was committed/visible, so when it finally resolves it overwrites the cache with a list that does **not** contain the new rows, undoing both the optimistic insert and the onSuccess merge.
3. **`onSettled` invalidates with `refetchType: 'none'`** — that only marks stale, but the in-flight refetch from step 1 is already running and TanStack still commits its (stale) result. There is no guard preventing a stale snapshot from clobbering newer optimistic / merged data.

A secondary, related issue: `getAttendanceForStudent` does strict subject/faculty matching. When the user later changes the Subject filter to "Mathematics", any record saved under a different (or null) subject silently disappears from the visible counts, which compounds the perception of "save lost".

## Fix plan (UI/cache layer only — no DB or RPC changes)

### 1. Stop refetches from clobbering optimistic & freshly-saved rows

In `src/hooks/queries/useAttendanceQuery.ts`:

- Track an in-flight mutation counter per `tuitionId` (module-level `Map<tuitionId, number>`, incremented in `onMutate` of both `useMarkAttendanceMutation` and `useBulkMarkAttendanceMutation`, decremented in `onSettled`).
- Wrap each query's `queryFn` so that after the network response it merges with the current cache instead of replacing: any record currently in the cache whose `(studentId, date, subjectId, facultyId)` tuple is **not** present in the fetched page is preserved (it's an in-flight write the server hasn't echoed yet). Only do this while the mutation counter > 0 OR within a 4-second post-mutation grace window.
- Add `structuralSharing` and a `select` that drops duplicates by `(studentId, date, subjectId, facultyId)` so optimistic temp ids cleanly transition to real ids without flicker.

### 2. Make per-tuition attendance refetches network-resilient

In `src/App.tsx` `QueryClient` options — keep the global defaults but for the attendance domain only:

- Set `refetchOnReconnect: 'always'` → `false` for the `['attendance', …]` query family via per-query options (we already disable focus refetch globally).
- Add `networkMode: 'online'` so the queryFn never runs while `navigator.onLine === false` (prevents a "phantom" empty refetch firing the moment the radio drops).
- Bump `staleTime` for the today/30-day view to 60 s so the natural focus/mount path doesn't ride on top of an active mutation.

### 3. Skip refetch entirely for ~5 s after any attendance write

In both `useMarkAttendanceMutation` and `useBulkMarkAttendanceMutation`:

- After `onSuccess` merges saved rows, set `queryClient.setQueryDefaults(['attendance', tuitionId], { refetchInterval: false })` and store a `Date.now() + 5000` cooldown.
- Wrap the attendance queryFn with `if (Date.now() < cooldown) return queryClient.getQueryData(queryKey) ?? [];` — returns current cache instead of issuing the HTTP request. This is the belt-and-braces guarantee that no in-flight or about-to-fire refetch can wipe the row the user just saved on a flaky connection.

### 4. Make individual & bulk toasts honest about persistence

In `src/components/AttendanceTracker.tsx`:

- Fire the "X marked as present" toast in the mutation's `onSuccess` rather than in `handleMarkAttendance` (currently fires immediately on click). On low network the click-time toast misleads the user into thinking it persisted when the request is still queued.
- Show a small "Saving…" pill on the row while `mutation.isPending` so the user has feedback during the slow leg of the round-trip.

### 5. Stop the strict-subject-filter from hiding already-saved rows

In `AttendanceTracker.tsx` `getAttendanceForStudent`:

- When `selectedSubject` is set but the student has a non-subject (general) record AND no subject-specific record for that date, fall back to showing the general record (read-only display only — new marks still write with the selected subject). This eliminates the "I just marked them and now they're blank again because I changed the subject filter" confusion that compounds the network glitch.

## Files to edit

- `src/hooks/queries/useAttendanceQuery.ts` — cooldown, merge-on-refetch, networkMode, per-tuition guards
- `src/App.tsx` — leave global defaults alone; only the attendance hook applies per-query options
- `src/components/AttendanceTracker.tsx` — toast timing, "Saving…" pill, fallback lookup in `getAttendanceForStudent`

## Out of scope

- No SQL / RPC / index changes (verified correct last turn).
- No change to bulk_mark_attendance behaviour, payload, or grants.
- No change to the desktop layout or mobile redesign you already approved.

## Verification

After implementing, I'll throttle the preview browser to "Slow 3G" + go offline/online twice during a bulk mark, confirm:
- `Present (N)` counter updates immediately and stays updated.
- Individual marks remain green after a forced offline/online cycle mid-save.
- Network tab shows zero attendance refetches in the 5 s after a save.
- Switching subject filter after a save no longer hides saved-but-general rows.
