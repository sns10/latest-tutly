-- Add unique constraint for student_test_results to enable upsert on (test_id, student_id)
ALTER TABLE public.student_test_results
ADD CONSTRAINT student_test_results_test_student_unique UNIQUE (test_id, student_id);

-- Add unique constraint for term_exam_results to enable upsert on (term_exam_id, student_id, subject_id)
ALTER TABLE public.term_exam_results
ADD CONSTRAINT term_exam_results_exam_student_subject_unique UNIQUE (term_exam_id, student_id, subject_id);