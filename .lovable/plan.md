# Fix decimal marks + add "Absent" marking for tests

## Part 1 — Bug fix: decimal marks (e.g. 19.5) silently fail to save

Database logs show:
```
ERROR: invalid input syntax for type integer: "19.5"
```

`student_test_results.marks` and `term_exam_results.marks` are `integer`, but the UI accepts decimals via `parseFloat`. Half-marks are common (19.5 / 4.5) and currently get rejected with only a generic "Failed to save" toast.

**Fix:** widen marks/max-marks columns to `numeric(6,2)`:
- `student_test_results.marks`
- `term_exam_results.marks`
- `weekly_tests.max_marks`
- `term_exam_subjects.max_marks`

Integer → numeric is a safe widening cast. No code change needed in queries (already uses `Number(...)` / `parseFloat`).

## Part 2 — New feature: mark a student as Absent for a test

Today the only way to "skip" a student is to leave the field blank, which means "not entered yet" — indistinguishable from absent. Teachers want an explicit Absent state for accurate reports/averages.

### Database
Add nullable column to both result tables:
- `student_test_results.is_absent boolean DEFAULT false`
- `term_exam_results.is_absent boolean DEFAULT false`

When `is_absent = true`, `marks` is forced to `0` server-side via a trigger (so existing reports keep summing correctly without crashing on NULL). Reports/averages will treat absentees as 0 — same as today's behaviour for missing entries — but now it's explicit and visible.

### Types
- `StudentTestResult` gains `isAbsent?: boolean` in `src/types.ts`.

### EnterMarksDialog (`src/components/EnterMarksDialog.tsx`)
Per student row, add a small **"Absent"** toggle/checkbox next to the marks input:
- When ticked: input is disabled and greyed out, marks set to 0, `isAbsent = true`.
- When unticked: input enabled, behave as today.
- Existing absent results show with the toggle pre-checked and an "AB" badge.
- Bulk Excel import: accept `"AB"` / `"Absent"` / `"A"` (case-insensitive) in the Marks/Grade column → `isAbsent = true, marks = 0`.
- Template download includes a note explaining "AB" usage.

### EnterTermExamMarksDialog (`src/components/term-exams/EnterTermExamMarksDialog.tsx` + `StudentWiseMarksEntry.tsx`)
Same Absent toggle for each subject row.

### Mutations (`useTestsQuery.ts`, `useTermExamData.ts`)
- `useAddTestResultMutation` / `useAddTestResultsBatchMutation`: include `is_absent` in upsert.
- Term exam equivalents: same.

### Display
- `TestResultsView` and Student Portal results: render "Absent" badge instead of "0" when `is_absent = true`.
- Reports (`ConsolidatedTestReport`, `TermExamReport`, `StudentReportCard`): show "AB" in the marks cell for absent entries; still count as 0 in totals/averages (no behaviour change vs. today, just clearer labelling).
- Class average computation: unchanged (absent = 0). If the user later wants "exclude absentees from average" we can add it as a follow-up.

## Files touched

```
supabase migration (alter columns + add is_absent + trigger)
src/types.ts
src/hooks/queries/useTestsQuery.ts
src/hooks/useTermExamData.ts
src/components/EnterMarksDialog.tsx
src/components/term-exams/EnterTermExamMarksDialog.tsx
src/components/term-exams/StudentWiseMarksEntry.tsx
src/components/TestResultsView.tsx
src/components/reports/ConsolidatedTestReport.tsx
src/components/reports/TermExamReport.tsx
src/components/reports/StudentReportCard.tsx
src/components/student-portal/* (results view)
.lovable/plan.md (update context)
```

## Backward compatibility

- All existing rows get `is_absent = false` by default → zero behavioural change for entered marks.
- Decimal widening is a superset of integer → all existing values remain valid.
- RLS policies unchanged.

## Verification

1. Enter `19.5` → saves successfully (previously failed).
2. Toggle a student to Absent → input disables, "AB" persists, reload shows AB.
3. Bulk import row with `AB` → student saved as absent.
4. Reports list shows AB for that student; class average unchanged.
