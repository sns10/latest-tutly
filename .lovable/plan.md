# Remove Academic Year Reset + Allow Past-Month Fee Marking

## Part 1 — Remove the "academic year reset" behavior

Today, fees / tests / homework queries silently scope themselves to the **current Indian academic year (June 1 → May 31)**. Every June 1 this acts like a "reset" — older records disappear from default views. You want this gone.

### Changes

1. **`src/hooks/queries/useFeesQuery.ts`**
   - Remove the default `.gte('due_date', getCurrentAcademicYearStart())` branch in `useFeesQuery`. Keep `month` and `fromDate` filters as-is. Result: all fees load by default (pagination loop already handles large datasets).
   - Drop the `getCurrentAcademicYearStart` import.

2. **`src/hooks/queries/useTestsQuery.ts`**
   - Remove the two `.gte('test_date', getPreviousAcademicYearStart())` defaults (lines ~22–24 and ~71–73). Drop the import.

3. **`src/hooks/useStudentData.ts`**
   - Remove the `.gte('test_date', getCurrentAcademicYearStart())` on tests and `.gte('due_date', getCurrentAcademicYearStart())` on homework. Drop the import. Keep `getDefaultAttendanceWindowStart` (attendance still needs a rolling 60-day window for perf).

4. **`src/lib/dateWindows.ts`**
   - Delete `getCurrentAcademicYearStart` and `getPreviousAcademicYearStart`. Keep `getDefaultAttendanceWindowStart`.

5. **Leave alone**: the `academic_year` *column* on `term_exams` — it's just a label admins type when creating an exam, not a reset/cutoff. No DB changes.

## Part 2 — Mark a previous-month fee in the current month

### Current behavior
- "Generate Monthly Fees" button in `FeesList.tsx` always uses **today's month**. If June is here and an admin wants to create May's fee record now, there is no UI path (besides per-student Custom Fees).
- Recording a *payment* against an existing past-month fee already works: `RecordPaymentDialog` has a "Payment Date" picker that allows back-dating to any past date.

### Change
Enhance `generateMonthlyFees` in `src/components/fees/FeesList.tsx` to let the admin pick the target month before generating:

- Add a small "Generate Fees" confirmation dialog (or reuse a simple month picker built from the existing `availableMonths` list, which already covers the last 12 months).
- Default the month to the current month (keeps today's one-tap flow intact).
- Use the picked month for both `feeType` (`Monthly Fee - YYYY-MM`) and `dueDate` (5th of that month).
- Existing duplicate-detection logic continues to work since it keys on `feeType` containing the month.

No schema, RLS, or backend changes.

## Files touched

```text
src/hooks/queries/useFeesQuery.ts       (remove academic-year default)
src/hooks/queries/useTestsQuery.ts      (remove academic-year default)
src/hooks/useStudentData.ts             (remove academic-year defaults)
src/lib/dateWindows.ts                  (drop academic-year helpers)
src/components/fees/FeesList.tsx        (month-picker for generate fees)
```

## Out of scope
- No changes to attendance windowing (still rolling 60 days for performance).
- No changes to `term_exams.academic_year` field.
- No changes to RecordPaymentDialog (back-dating already supported).
