## What I found

The latest bulk save request did reach the backend and returned success. For the latest class/session I checked, the database has the saved `present` rows.

So the recurring failure is not simply “backend did not save”. The remaining bug is in the attendance screen logic:

1. **The UI uses fallback attendance as if it were current-session attendance**
   - If a student has a general same-day attendance row, the row can look present even when the selected subject/faculty session has no exact record.
   - Then `Mark All Present` skips that student because it thinks they are already present.
   - Result: the button appears to work visually, but the exact class/session still remains incomplete.

2. **The bulk button currently targets the filtered visible list**
   - If a status filter/search is active, `Mark All Present` can mark only that subset, not the whole selected class/division.
   - This makes the behavior feel inconsistent and is likely why it keeps “coming back”.

3. **Stats were changed to match row display, but that can hide missing exact rows**
   - The previous fix made counters match what the rows show.
   - But because rows can use fallback attendance, the counters can also show “present” even when the exact selected session was not written.

## Fix plan

### 1. Split attendance lookup into two meanings
- Add an **exact session lookup**:
  - student + date + selected subject + selected faculty
  - used for saving, bulk decisions, and session completeness.
- Keep a **display lookup**:
  - exact session first, then general same-day fallback
  - used only when rendering the row status.

### 2. Make `Mark All Present` write exact current-session rows
- For selected subject/faculty, it will mark every target student who does **not** already have an exact `present` row for that session.
- A fallback/general `present` row will no longer cause the student to be skipped.
- This ensures the selected class session is actually saved, not just visually inferred.

### 3. Make the bulk target predictable
- `Mark All Present` will operate on the selected class/division target set, not the current status-filter subset.
- The status filter remains only for viewing students.
- The button label/count will reflect the real number of students that still need exact `present` rows for the selected session.

### 4. Show clearer session state
- Keep rows readable, but make stats/counts based on exact current-session records so teachers can trust whether this class session is complete.
- If fallback attendance is being shown, avoid letting it mask missing exact session rows.

### 5. Verify after implementation
- Test the flow on `/attendance`:
  - select class/session
  - mark one/two students absent
  - click `Mark All Present`
  - confirm stats become all present
  - confirm the backend request returns the same number of rows requested
  - confirm refreshing/reopening the page still shows all present for that exact session

## Files to update

- `src/components/AttendanceTracker.tsx`
  - exact vs display attendance lookup
  - bulk target/count logic
  - stats/session completeness logic
  - button label behavior

No database schema change is planned unless verification shows the backend saved-row count is wrong.