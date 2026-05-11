## Add Division Selection to Weekly Tests

Currently a weekly test is tied to a `class` only. When two divisions of the same class write different tests on the same day, there's no way to separate them. We'll let each test optionally target a specific division (defaulting to "All Divisions" for backward compatibility).

### 1. Database
New migration on `weekly_tests`:
- Add nullable `division_id uuid` column.
- `NULL` = test applies to all divisions of that class (existing rows stay valid — zero-impact backfill).
- No FK constraint needed (matches the project's existing pattern where `students.division_id` is unconstrained).

### 2. Types
- `src/types.ts` → `WeeklyTest` gains `divisionId?: string`.

### 3. Create Test Dialog (`src/components/CreateTestDialog.tsx`)
- Accept `divisions: Division[]` prop.
- Add a **Division** select between Class and Subject:
  - Options: "All Divisions" + divisions filtered by selected class.
  - Hidden / forced to "All" when `class === "All"`.
  - Resets when class changes (prevents stale division from another class).
- Include `divisionId` in submitted payload.

### 4. Data layer (`src/hooks/queries/useTestsQuery.ts`)
- `useWeeklyTestsQuery`: map `division_id` → `divisionId` in the returned object.
- `useAddWeeklyTestMutation`: insert `division_id: newTest.divisionId ?? null`.

### 5. Weekly Test Manager (`src/components/WeeklyTestManager.tsx`)
- Pass `divisions` to `CreateTestDialog`.
- `getTestStats`: when `test.divisionId` is set, also filter `eligibleStudents` by `s.divisionId === test.divisionId`.
- Show a Division badge on each test card (e.g. "Div A") when set.
- Pass division-filtered student list to `TestResultsView` and `EnterMarksDialog`.

### 6. Enter Marks Dialog (`src/components/EnterMarksDialog.tsx`)
- If `test.divisionId` is set: pre-filter students to that division and hide the division filter dropdown (already exists as a client-side filter, so we just lock it).
- If unset: behave exactly as today.

### 7. Backward compatibility & safety
- All existing tests have `division_id = NULL` → they continue to include all students of the class. No data migration needed, no breakage in marks already entered (results are linked by `test_id` + `student_id`).
- Reports (`ConsolidatedTestReport`, `TestResultsView`) keep working: students list is already passed in from the parent, which we'll narrow correctly.
- RLS unchanged (still scoped by `tuition_id`).

### Files touched
```
supabase migration             (add weekly_tests.division_id)
src/types.ts
src/components/CreateTestDialog.tsx
src/components/WeeklyTestManager.tsx
src/components/EnterMarksDialog.tsx
src/hooks/queries/useTestsQuery.ts
```

Approve to implement.