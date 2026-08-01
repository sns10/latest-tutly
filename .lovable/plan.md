# Attendance marking review

## What I checked

- Live database: 127,229 attendance rows, 2,683 in the last 7 days, marks landing every day including today (Aug 1: 182 present / 18 absent).
- Duplicate check on (student, date, subject, faculty): **0 duplicate rows** — the unique index and the bulk RPC are behaving.
- Postgres error/fatal logs: **no errors** recorded.

So bulk "Mark All Present" is saving correctly now. What remains are three real logic issues in the client code that can still produce wrong or confusing behaviour.

## Issue 1 — single tap can fail with a duplicate-key error (race)

`useMarkAttendanceMutation` does a *select, then insert-or-update*. Two quick taps on the same student (or a retry after a slow network) can both read "no existing row" and both insert. The second insert hits the unique index, throws, the optimistic green rolls back, and the user sees "Failed to mark attendance" even though the row exists.

**Fix:** route single marks through the same `bulk_mark_attendance` RPC (a single-element array). It is a transactional upsert with `ON CONFLICT`, so the race disappears and single/bulk marking share one code path.

## Issue 2 — display fallback makes an unmarked session look marked

When a subject/faculty is selected, `getAttendanceForStudent` falls back to the student's *general* (no-subject) row for display. The row shows green while the selected session actually has no record. Stats and the "Mark All Present" count already use the exact-session lookup, so the list disagrees with the counters.

**Fix:** keep the fallback but render it visually distinct (muted/outlined dot with a "from general" hint) instead of as a confirmed mark for this session.

## Issue 3 — inconsistent scope between bulk actions

- Mark All **Present** targets the whole class/division roster and overwrites absent/late/excused.
- Mark All **Absent/Late/Excused** only touches students with *no* record at all.
- **Copy from previous session** uses the search-filtered list, not the full roster.

**Fix:** make all three operate on the same roster scope (`targetStudents`) and use the same overwrite rule, with the button label stating what it will do.

## Not changing

- The `bulk_mark_attendance` RPC and the unique index — verified correct.
- The `recentlySavedRows` 90-second reconcile buffer and `refetchOnReconnect: false` — these are what stopped the "saved but rolled back" glitch.
- Any report or student-detail derivation logic.

## Technical notes

Files touched: `src/hooks/queries/useAttendanceQuery.ts` (single-mark path → RPC), `src/components/AttendanceTracker.tsx` (bulk scope + fallback flag), `src/components/attendance/VirtualizedStudentList.tsx` (fallback styling). No database migration required.
