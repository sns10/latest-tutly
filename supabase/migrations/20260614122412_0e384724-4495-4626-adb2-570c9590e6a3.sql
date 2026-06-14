
-- 1) Clean up ghost duplicates: if a (student_id, date) has BOTH a NULL-subject row
--    and a real-subject row, delete the NULL-subject row (subject-specific is source of truth).
DELETE FROM public.student_attendance sa_null
USING public.student_attendance sa_real
WHERE sa_null.student_id = sa_real.student_id
  AND sa_null.date = sa_real.date
  AND sa_null.subject_id IS NULL
  AND sa_null.faculty_id IS NULL
  AND sa_real.subject_id IS NOT NULL;

-- 2) Drop the broken plain unique constraint (NULL != NULL bypass)
ALTER TABLE public.student_attendance
  DROP CONSTRAINT IF EXISTS student_attendance_student_date_subject_faculty_unique;

-- 3) Drop the duplicate COALESCE index, keep student_attendance_unique_idx
DROP INDEX IF EXISTS public.idx_student_attendance_unique;

-- 4) Add updated_at trigger so modifications are tracked
DROP TRIGGER IF EXISTS update_student_attendance_updated_at ON public.student_attendance;
CREATE TRIGGER update_student_attendance_updated_at
  BEFORE UPDATE ON public.student_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
