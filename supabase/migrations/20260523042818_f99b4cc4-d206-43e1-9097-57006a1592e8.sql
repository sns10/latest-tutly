ALTER TABLE public.student_test_results
  DROP CONSTRAINT IF EXISTS student_test_results_test_student_unique;

ALTER TABLE public.term_exam_results
  DROP CONSTRAINT IF EXISTS term_exam_results_exam_student_subject_unique;