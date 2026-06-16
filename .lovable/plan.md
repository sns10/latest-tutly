Root cause seen from the recording

- The green P buttons appear first because the app applies an optimistic update immediately.
- Then the bulk save fails, React Query rolls back to the previous attendance cache, and the green marks disappear.
- The “students marked as present” toast is currently shown before the save finishes, so it can say success even when the backend later rejects the bulk request.
- The most likely backend failure is inside the new `bulk_mark_attendance` database function: its returned column names (`student_id`, `date`, `status`, etc.) collide with same-named SQL columns in the `RETURN QUERY` statement, which can make the function throw at runtime and roll back the optimistic UI.

Plan

1. Fix the bulk attendance backend function safely
   - Replace the body of `bulk_mark_attendance(_records jsonb)` with an alias-safe version.
   - Use internal column aliases like `record_student_id`, `record_date`, `record_status` so Postgres cannot confuse function output variables with table/CTE columns.
   - Keep the same security behavior: authenticated user required, tuition ownership check, super admin bypass, same `student_attendance` table, same subject/faculty context matching.
   - Keep the existing single set-based upsert so “Mark All Present” stays fast.
   - Deduplicate identical records inside the function to avoid `ON CONFLICT DO UPDATE command cannot affect row a second time` if the client ever sends duplicate rows.

2. Fix the misleading success message
   - Remove the immediate `toast.success(...)` from `AttendanceTracker.handleBulkAttendance` and `handleCopyFromPreviousClass`.
   - Show the success toast only in `useBulkMarkAttendanceMutation.onSuccess`, after the backend confirms saved rows.
   - Keep the current rollback and “Failed to save attendance” toast on error.

3. Keep attendance logic unchanged
   - Do not change the “mark only unmarked students” rule.
   - Do not change subject/faculty matching.
   - Do not overwrite already-marked attendance in bulk from the UI, because the UI still only sends unmarked students.
   - Do not change reports/student detail derivation in this fix.

4. Verify after implementation
   - Confirm the database function definition is updated.
   - Check that the frontend no longer shows success while the button still says “Saving…”.
   - Confirm cache merge still keeps green marks visible after a successful save.
   - If the backend still rejects, inspect the exact RPC/network error next rather than changing attendance logic blindly.