## Attendance Sector Hardening Plan

Three parallel audits (marking, derivation/reports, DB+edge) found real correctness bugs across the attendance flow. Below is a prioritized fix list. Bulk marking behavior stays as you wanted: **bulk only marks unmarked students; never overwrites**.

### 1. Date and context normalization (highest impact)

- **UTC date bug**: `formatDate` uses `toISOString()` which shifts to UTC. For users in negative-UTC timezones every "today" read/write can land on the wrong calendar day, and special-class detection breaks. Replace with a local-date formatter and apply everywhere (`AttendanceTracker`, `useAttendanceQuery` defaults, `useTodayAttendanceQuery`, smart-detect, today's classes).
- **`undefined` vs `null` mismatch**: `formatAttendance` stores `subjectId/facultyId` as `undefined`, but several lookups compare against `null`. This silently breaks Copy-from-Previous-Class and "same session" detection. Normalize comparisons to `?? null` and align mapping.
- **Stats vs row lookup mismatch**: `stats` uses a loose filter while `getAttendanceForStudent` uses a strict null-context filter. Result: chip counts and row state disagree. Make `stats` use the same strict session context as the row lookup so present count, unmarked count, and chip badges always match the visible list.

### 2. Save-path resilience (no inconsistent green dots)

- **Partial bulk-failure rollback gap**: Currently only throws when every row fails — partial failures leave optimistic dots that disagree with DB until a later refetch. Surface a real error/rollback when any row fails, and reconcile the failed students immediately rather than relying solely on a delayed invalidation.
- **Fallback per-student loop race** in copy-from-previous: when bulk handler is missing, the N parallel single mutations race their own snapshots. Route the copy path through a guaranteed bulk handler so there's a single atomic optimistic update.
- **Narrower cache invalidation key** so marking doesn't refetch unrelated historical/report queries.

### 3. Derivation correctness (reports, student details, portal)

The DB model allows multiple rows per student per day (one per subject session). Several derivations treat row count as "total classes/days" — inflating denominators and producing wrong percentages. Fix all of them with a shared, single source of truth:

- Add a small `lib/attendance` helper exposing per-day deduplication with a clear priority (`present` > `late` > `excused` > `absent`), unique-day counts, and a single "is attending" predicate (`present` and `late` count as attending — chosen to match the reports policy and applied consistently).
- Use it in:
  - `MonthlyAttendanceReport` (total/percentage)
  - `StudentReportCard` (printed/PDF percentage)
  - `StudentDetailsDialog` overview attendance rate, streak, calendar coloring
  - `pages/Student.tsx` portal attendance rate
  - `AttendanceCalendar` day color (priority instead of first-wins)
  - `useAttendanceStreak` (late counts toward streak — match reports policy)
  - `useStudentAlerts` (don't let a single excused session suppress an otherwise-absent day)
- `useDailySummary`: stop double-counting students in both present and absent sets, and stop matching `"undefined-undefined"` keys for classes-with-attendance.

### 4. Dashboard RPC fix

- `get_tuition_dashboard_stats` counts rows, not unique students, so `presentToday/absentToday` are inflated and a student can appear in both. Update the SQL to count distinct students per status with the same priority used in the UI, so any future consumer of the RPC gets the same numbers the UI shows.

### 5. Report generator scoping

- `generate-report` absentees query filters on a related table without `!inner`, which can leak rows from other classes into the PDF. Switch to `students!inner(...)` and apply the class/division filters on the joined side correctly.

### 6. Cleanups (low risk, prevent future regressions)

- Delete the dead `src/components/attendance/AttendanceControls.tsx` (not imported anywhere; diverges from the real bulk interface).
- Tighten `VirtualizedStudentList` row size with `measureElement` (or larger estimate) so rows don't overlap when names wrap on narrow screens.
- Leave RLS policies as-is (audit found overlap but no actual leak); document the intended layering.

### Technical details

Files touched:
- `src/components/AttendanceTracker.tsx`
- `src/hooks/queries/useAttendanceQuery.ts`
- `src/lib/attendance.ts` (new — shared helpers)
- `src/components/MonthlyAttendanceReport.tsx`
- `src/components/StudentReportCard.tsx`
- `src/components/StudentDetailsDialog.tsx`
- `src/pages/Student.tsx`
- `src/components/AttendanceCalendar.tsx`
- `src/hooks/useAttendanceStreak.ts`
- `src/hooks/useStudentAlerts.tsx`
- `src/hooks/useDailySummary.ts`
- `src/components/attendance/VirtualizedStudentList.tsx`
- Delete: `src/components/attendance/AttendanceControls.tsx`
- `supabase/functions/generate-report/*` (absentees query scoping)
- One migration to update `get_tuition_dashboard_stats`

Non-goals:
- Not changing the storage model (per-session rows stay).
- Not changing bulk behavior (still only marks unmarked).
- Not altering RLS policies.

### Validation
- Mark/unmark across multiple subjects on the same day — UI dot state matches DB after refresh.
- Monthly report and report card show the same percentage for the same period.
- Student details overview, portal home, and report card all agree on attendance %.
- Calendar day color uses priority (present > late > excused > absent) — no first-wins flicker.
- Absence alert fires correctly even when one session of the day is excused.
- Daily summary numbers add up to ≤ total students.
- Dashboard RPC returns same totals as the UI.
- Cross-class leakage check on absentees PDF.