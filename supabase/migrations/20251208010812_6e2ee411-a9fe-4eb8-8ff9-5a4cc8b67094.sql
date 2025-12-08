-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop and recreate the problematic policies that reference auth.users directly

-- Fix tuitions policies
DROP POLICY IF EXISTS "Portal users can view their tuition" ON public.tuitions;
CREATE POLICY "Portal users can view their tuition" 
ON public.tuitions 
FOR SELECT 
USING (portal_email = public.get_user_email());

-- Fix students policies
DROP POLICY IF EXISTS "Portal users can view tuition students" ON public.students;
CREATE POLICY "Portal users can view tuition students" 
ON public.students 
FOR SELECT 
USING (tuition_id IN (
  SELECT id FROM public.tuitions WHERE portal_email = public.get_user_email()
));

-- Fix student_attendance policies
DROP POLICY IF EXISTS "Portal users can view tuition attendance" ON public.student_attendance;
CREATE POLICY "Portal users can view tuition attendance" 
ON public.student_attendance 
FOR SELECT 
USING (student_id IN (
  SELECT s.id FROM students s
  JOIN tuitions t ON s.tuition_id = t.id
  WHERE t.portal_email = public.get_user_email()
));

-- Fix student_test_results policies
DROP POLICY IF EXISTS "Portal users can view tuition test results" ON public.student_test_results;
CREATE POLICY "Portal users can view tuition test results" 
ON public.student_test_results 
FOR SELECT 
USING (student_id IN (
  SELECT s.id FROM students s
  JOIN tuitions t ON s.tuition_id = t.id
  WHERE t.portal_email = public.get_user_email()
));

-- Fix student_fees policies
DROP POLICY IF EXISTS "Portal users can view tuition fees" ON public.student_fees;
CREATE POLICY "Portal users can view tuition fees" 
ON public.student_fees 
FOR SELECT 
USING (student_id IN (
  SELECT s.id FROM students s
  JOIN tuitions t ON s.tuition_id = t.id
  WHERE t.portal_email = public.get_user_email()
));

-- Fix announcements policies
DROP POLICY IF EXISTS "Portal users can view tuition announcements" ON public.announcements;
CREATE POLICY "Portal users can view tuition announcements" 
ON public.announcements 
FOR SELECT 
USING (tuition_id IN (
  SELECT id FROM public.tuitions WHERE portal_email = public.get_user_email()
));

-- Fix subjects policies
DROP POLICY IF EXISTS "Portal users can view tuition subjects" ON public.subjects;
CREATE POLICY "Portal users can view tuition subjects" 
ON public.subjects 
FOR SELECT 
USING (tuition_id IN (
  SELECT id FROM public.tuitions WHERE portal_email = public.get_user_email()
));

-- Fix weekly_tests policies
DROP POLICY IF EXISTS "Portal users can view tuition tests" ON public.weekly_tests;
CREATE POLICY "Portal users can view tuition tests" 
ON public.weekly_tests 
FOR SELECT 
USING (tuition_id IN (
  SELECT id FROM public.tuitions WHERE portal_email = public.get_user_email()
));