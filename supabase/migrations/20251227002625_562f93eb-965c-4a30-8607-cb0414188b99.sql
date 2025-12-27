-- Performance indexes for frequently queried tables
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date ON public.student_attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_fees_student_status ON public.student_fees(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_fees_due_date ON public.student_fees(due_date);
CREATE INDEX IF NOT EXISTS idx_timetable_day_time ON public.timetable(day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON public.timetable(class);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class);
CREATE INDEX IF NOT EXISTS idx_students_tuition ON public.students(tuition_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tests_date ON public.weekly_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_student_test_results_student ON public.student_test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee ON public.fee_payments(fee_id);