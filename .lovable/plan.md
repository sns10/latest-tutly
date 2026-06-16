The live request is failing in the backend, not on the phone UI.

**Actual issue**
- The `Mark All Present` button first paints green because the app does an optimistic UI update.
- The backend then rejects the bulk save with:
  - `column reference "student_id" is ambiguous`
- Because save failed, React Query correctly rolls back the green marks and shows `Failed to save attendance`.
- So for this failed click, attendance is **not saved**; the UI rollback is protecting data consistency.

**Do I know what the issue is?**
Yes. The database function returns columns named `student_id`, `date`, `status`, etc. In PL/pgSQL those returned column names become hidden variables. Inside the same function, the `ON CONFLICT (student_id, date, ...)` clause uses the same names, so Postgres cannot decide whether `student_id` means the attendance table column or the function output variable.

**Files / areas involved**
- Backend function: `public.bulk_mark_attendance(jsonb)`
- Frontend caller: `src/hooks/queries/useAttendanceQuery.ts`
- UI trigger: `src/components/AttendanceTracker.tsx`

**Plan**
1. Replace only the `bulk_mark_attendance` backend function with an ambiguity-safe version.
   - Remove `RETURNS TABLE(...)` output-variable ambiguity by returning `SETOF public.student_attendance`, or otherwise force SQL names to resolve as table columns.
   - Keep the existing same-tenant safety checks.
   - Keep the same bulk upsert behavior and same returned fields.
   - Keep duplicate payload protection.
2. Add clearer backend validation for bad payloads.
   - Reject unauthenticated calls.
   - Reject invalid status values before saving.
   - Keep subject/faculty null handling unchanged.
3. Verify the attendance unique index is still correct.
   - The live database already has the expected expression unique index.
   - No table structure changes are needed.
4. Make a tiny frontend improvement if needed.
   - Keep optimistic UI.
   - Keep rollback on real failure.
   - Do not overwrite individual attendance logic.
   - Preserve success toast only after backend confirmation.
5. Validate after migration.
   - Re-check the function definition.
   - Confirm the failing ambiguous `student_id` error is gone.
   - User can retry `Mark All Present`; if it succeeds, the green marks should remain.

**Important safety note**
This fix will not change who can mark attendance or which students are marked. It only fixes the backend bulk-save function name conflict that is currently causing the rollback.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>