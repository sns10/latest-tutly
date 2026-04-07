

# Fix: Uncap Attendance Fetch Only During Report Generation

## Problem
The `useHistoricalAttendanceQuery` has a `MAX_RECORDS = 5000` cap that silently drops records for large tuition centers. However, removing the cap globally would hurt performance since this hook auto-fires whenever `startDate`/`endDate` are set.

## Approach
Keep the existing `useHistoricalAttendanceQuery` as-is for normal usage (capped at 5000). Add a new dedicated hook `useReportAttendanceQuery` with NO cap, but with `enabled: false` by default — it only fires when the user explicitly triggers report generation via a button click.

The `MonthlyAttendanceReport` component will switch to using this on-demand hook with `refetch()` called when the user clicks "Generate Report", instead of auto-fetching on every date change.

## Changes

### File: `src/hooks/queries/useAttendanceQuery.ts`
- Add new `useReportAttendanceQuery` hook:
  - Same pagination loop as `useHistoricalAttendanceQuery` but NO `MAX_RECORDS` cap
  - `enabled: false` — only runs when manually triggered via `refetch()`
  - Optimized select clause: `id, student_id, date, status, notes, subject_id, faculty_id, created_at, updated_at` instead of `*`
  - Longer `staleTime` (10 min) since report data doesn't change often

### File: `src/components/reports/MonthlyAttendanceReport.tsx`
- Replace `useHistoricalAttendanceQuery` with `useReportAttendanceQuery`
- Add a "Generate Report" button that calls `refetch()`
- Show loading state while fetching
- Date changes no longer auto-fetch — user picks dates first, then clicks generate

### File: `src/hooks/queries/index.ts`
- Export the new `useReportAttendanceQuery` hook

