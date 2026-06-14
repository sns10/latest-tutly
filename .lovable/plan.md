# Fix Attendance "Green Dot" Mismatch

Investigation found the root causes: the UI shows a present indicator that doesn't match the database. Multiple bugs combine — frontend, mutation cache, and database constraints.

## What's actually broken

**Database (6,425 conflicting rows exist today across 1,294 students):**
1. Two parallel attendance flows coexist — one writes `subject_id/faculty_id = NULL`, the other writes real UUIDs. Both rows survive for the same student+date, with conflicting statuses (e.g. null-row=`present`, subject-row=`absent`).
2. The plain `UNIQUE(student_id, date, subject_id, faculty_id)` constraint is broken because Postgres treats `NULL ≠ NULL`. Two `COALESCE` unique indexes exist as duplicates of each other.
3. No `updated_at` trigger — modifications can't be audited.

**Frontend (`src/components/AttendanceTracker.tsx`):**
4. `getAttendanceForStudent` (lines ~160–176): when `selectedSubject` is empty, it returns the *first* attendance row for that student on that date — regardless of subject. So a "present" mark for Math shows as a green dot in the "All subjects" / cleared view.

**Mutation hook (`src/hooks/queries/useAttendanceQuery.ts`):**
5. Optimistic update writes to hardcoded cache key `['attendance', tuitionId, undefined]` (lines 319, 360) — other consumers using filters never see it.
6. `onSettled` uses `refetchType: 'none'` (lines ~376, 472) — UI is never reconciled with the DB, so silent failures (RLS, upsert collisions) leave a stale green dot for up to 30 min.
7. Bulk upsert uses `onConflict: 'student_id,date,subject_id,faculty_id'` — fails to dedupe when subject/faculty are NULL, creating duplicate DB rows on every "Mark All Present".
8. Bulk optimistic temp IDs use `Date.now()` — collisions on rapid loops produce phantom duplicate rows in cache.

## Fix plan

### 1. Frontend — `AttendanceTracker.tsx`
Tighten `getAttendanceForStudent` so a row only matches the current context:
- If `selectedSubject` is empty, only match rows where `a.subjectId` is also null/empty (not "any subject").
- Same for `selectedFaculty`.
- This prevents cross-subject green-dot bleed.

### 2. Mutation hook — `src/hooks/queries/useAttendanceQuery.ts`
- Replace the two hardcoded `['attendance', tuitionId, undefined]` cache writes with `queryClient.getQueriesData({ queryKey: ['attendance', tuitionId] })` / `setQueriesData` so every filter-variant cache is updated.
- Change `onSettled` from `refetchType: 'none'` to a real invalidation (default `'active'`) on both single and bulk mutations. UI then reconciles with the DB after each write.
- Fix bulk upsert: switch `onConflict` to the COALESCE-based unique index name (`student_attendance_unique_idx`) or, simpler and safer, do a `select → update existing / insert new` per-record path like the single-mark flow already does. Eliminates NULL-key duplicates.
- Replace `temp-${Date.now()}-${studentId}` with `temp-${crypto.randomUUID()}` to remove collision risk.

### 3. Database migration (new timestamped file)
- Drop the duplicate index `idx_student_attendance_unique` (keep `student_attendance_unique_idx`).
- Drop the broken plain unique constraint `student_attendance_student_date_subject_faculty_unique`.
- Backfill cleanup for the 6,425 conflicting pairs: for each `(student_id, date)` with both a null-key row and a subject-key row, delete the null-key row (the subject-specific record is the source of truth from the current flow). Wrap in a single transaction; log counts.
- Add an `updated_at` trigger using the existing `update_updated_at_column()` function so future edits are traceable.
- Do **not** widen RLS — current policy is correct; silent failures are now caught by the refetch in step 2.

### 4. Verification
- Mark one student present for Math → switch subject to Science → student should appear **unmarked** (no green dot bleed).
- Use "Mark All Present" on a class with no subject context → verify only one row per student per date is created in DB (run `SELECT COUNT(*) GROUP BY student_id, date HAVING COUNT(*)>1`).
- Mark a student absent → hard refresh → status persists correctly.
- Confirm the duplicate-row count after cleanup migration is 0.

## Out of scope
- Redesigning the dual subject/no-subject flows (keeping both, just preventing them from colliding).
- Changing RLS policies.
- Any non-attendance code.
