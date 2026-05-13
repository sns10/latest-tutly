
ALTER TABLE public.weekly_tests ALTER COLUMN max_marks TYPE numeric(6,2);
ALTER TABLE public.student_test_results ALTER COLUMN marks TYPE numeric(6,2);
ALTER TABLE public.term_exam_subjects ALTER COLUMN max_marks TYPE numeric(6,2);
ALTER TABLE public.term_exam_results ALTER COLUMN marks TYPE numeric(6,2);

ALTER TABLE public.student_test_results ADD COLUMN IF NOT EXISTS is_absent boolean NOT NULL DEFAULT false;
ALTER TABLE public.term_exam_results ADD COLUMN IF NOT EXISTS is_absent boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.force_zero_marks_when_absent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_absent THEN
    NEW.marks := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_zero_marks_when_absent_test ON public.student_test_results;
CREATE TRIGGER trg_force_zero_marks_when_absent_test
BEFORE INSERT OR UPDATE ON public.student_test_results
FOR EACH ROW EXECUTE FUNCTION public.force_zero_marks_when_absent();

DROP TRIGGER IF EXISTS trg_force_zero_marks_when_absent_term ON public.term_exam_results;
CREATE TRIGGER trg_force_zero_marks_when_absent_term
BEFORE INSERT OR UPDATE ON public.term_exam_results
FOR EACH ROW EXECUTE FUNCTION public.force_zero_marks_when_absent();
