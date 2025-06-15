
-- Enable Row Level Security and add permissive policies for all tables
-- This is a temporary measure until user authentication is implemented.

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to challenges" ON public.challenges FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to class_fees" ON public.class_fees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to student_attendance" ON public.student_attendance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to student_badges" ON public.student_badges FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to student_challenges" ON public.student_challenges FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to student_fees" ON public.student_fees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to student_rewards" ON public.student_rewards FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to student_test_results" ON public.student_test_results FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to student_xp" ON public.student_xp FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.weekly_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to weekly_tests" ON public.weekly_tests FOR ALL USING (true) WITH CHECK (true);

