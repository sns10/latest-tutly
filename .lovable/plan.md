## Root cause

When I added the "Mark Absent" feature, the migration created a new `UNIQUE (test_id, student_id)` constraint on `student_test_results` — but an identical unique constraint **already existed**. Same thing happened on `term_exam_results`.

Current state in the database:

```text
student_test_results:
  UNIQUE (test_id, student_id)  -- student_test_results_test_id_student_id_key   (original)
  UNIQUE (test_id, student_id)  -- student_test_results_test_student_unique      (added by absent migration)

term_exam_results:
  UNIQUE (term_exam_id, student_id, subject_id)  -- *_key             (original)
  UNIQUE (term_exam_id, student_id, subject_id)  -- *_unique          (added)
```

### Why this breaks bulk save

The frontend does:
```ts
.upsert(records, { onConflict: 'test_id,student_id' })
```

Postgres can only use **one** arbiter index for `ON CONFLICT`. The first unique index resolves to UPDATE, but the second duplicate unique index still fires as a fresh insert violation → entire batch fails with `duplicate key value violates unique constraint "student_test_results_test_student_unique"`. So:

- First-time mark entry (no existing rows) → works
- Re-saving / editing already-entered marks (bulk Save All) → fails with "Failed to save marks"

This matches the symptom: "Weekly test — bulk save → Toast: Failed to save", and explains why no 4xx shows in the edge log window (it's a 409 from PostgREST that's intermittent and may roll out of the 1-hour log window).

## Fix

Single migration that drops the redundant constraints, keeping the original `*_key` one on each table.

```sql
ALTER TABLE public.student_test_results
  DROP CONSTRAINT IF EXISTS student_test_results_test_student_unique;

ALTER TABLE public.term_exam_results
  DROP CONSTRAINT IF EXISTS term_exam_results_exam_student_subject_unique;
```

No frontend changes needed — the upsert calls already infer the correct (and now sole) unique index by columns.

## Verification

1. After the migration, re-open Enter Marks on a test that already has results, edit a few marks, click Save All — should succeed.
2. Re-run for term exams: enter subject marks for students who already have entries — should succeed.
3. Confirm `pg_constraint` shows only one unique constraint per table.
