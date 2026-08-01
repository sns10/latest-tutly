## Why it is slow today

Every attendance-touching screen downloads **30 days of attendance for the whole tuition** before it can render. For the busiest centre that is 13,317 rows fetched in 14 sequential 1000-row round trips, with the full row payload plus a joined `students` object. The dashboard, the Students page and the Attendance page each do this independently.

The Attendance screen only ever displays **one day** at a time, so 97% of that download is wasted.

## What will change

### 1. Attendance page loads only the selected day

The date picker currently lives inside the tracker while the data is fetched one level above it, so the page has to guess and pull 30 days. The selected date moves up to the page, and attendance is fetched for that single date (a few hundred rows, one round trip). Changing the date fetches that day only, and previously viewed days stay cached.

Everything the tracker does — session detection, copy-from-previous-class, stats, bulk marking — already works off the selected date only, so behaviour is unchanged.

### 2. Dashboard fetches a short window

The home dashboard needs today's numbers plus a short recent history for the absence alerts. It will fetch a 14-day window instead of 30 days, roughly halving that payload.

### 3. Students list fetches only what it shows

The Students page pulls 30 days of tuition-wide attendance purely to compute the streak badge, which is only rendered when gamification is enabled. That query becomes conditional and window-limited.

### 4. Lighter rows

All attendance queries will select only the columns actually used instead of `*` plus the joined student object, cutting transfer size on every fetch.

## Explicitly preserved

- **Student attendance history**: clicking a student still opens the full per-student history (calendar, subject-wise breakdown, streaks). That view uses its own per-student query and is not touched.
- **Reports for a chosen timeline**: the monthly/report generation still uses the on-demand full-range query, unpaginated and uncapped, exactly as it works today.
- No change to marking, the bulk RPC, or the saved-row reconciliation buffer.

## Technical notes

- `src/pages/Attendance.tsx`: own `selectedDate` state, pass `selectedDate` + `onDateChange` to `AttendanceTracker`, and call `useAttendanceQuery(tuitionId, { date })`.
- `src/components/AttendanceTracker.tsx`: make the date controlled via props (keep an internal default of today), leave all lookup and bulk logic untouched. Smart-detect still sets subject/faculty for today.
- `src/hooks/queries/useAttendanceQuery.ts`: add an optional `days` window (default 30) used when no date/range is given; replace `select('*, students!inner(tuition_id)')` with an explicit column list plus the same inner join filter; keep the pagination loop, stale times, `refetchOnReconnect: false` and reconcile buffer as-is.
- `src/pages/Index.tsx`: `useAttendanceQuery(tuitionId, { days: 14 })`.
- `src/pages/Students.tsx`: window the tuition-wide query and gate it on the gamification feature; keep `useStudentAttendanceQuery` for the details dialog.
- Mutations already invalidate the `['attendance', tuitionId, ...]` key prefix, so date-scoped caches refresh correctly; the bulk path's direct cache merge will be updated to write into whichever attendance caches are present.
- No database or index changes — `idx_student_attendance_date` and `idx_student_attendance_student_date` already cover these access paths.