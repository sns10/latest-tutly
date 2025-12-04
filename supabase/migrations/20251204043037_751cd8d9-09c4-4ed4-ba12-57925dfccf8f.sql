-- Fix overly permissive RLS policies on multi-tenant tables

-- 1. Fix student_badges table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.student_badges;

CREATE POLICY "Multi-tenant badges access" ON public.student_badges
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  );

-- 2. Fix student_challenges table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.student_challenges;

CREATE POLICY "Multi-tenant challenges access" ON public.student_challenges
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  );

-- 3. Fix student_rewards table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.student_rewards;

CREATE POLICY "Multi-tenant rewards access" ON public.student_rewards
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  );

-- 4. Fix student_xp table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.student_xp;

CREATE POLICY "Multi-tenant xp access" ON public.student_xp
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  );

-- 5. Fix student_test_results table (keep existing student view policy)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.student_test_results;

CREATE POLICY "Multi-tenant test results access" ON public.student_test_results
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (has_role(auth.uid(), 'tuition_admin'::app_role) AND 
     student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (has_role(auth.uid(), 'tuition_admin'::app_role) AND 
     student_id IN (SELECT id FROM students WHERE tuition_id = get_user_tuition_id(auth.uid())))
  );

-- 6. Fix faculty_subjects table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.faculty_subjects;

CREATE POLICY "Multi-tenant faculty_subjects access" ON public.faculty_subjects
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (faculty_id IN (SELECT id FROM faculty WHERE tuition_id = get_user_tuition_id(auth.uid())))
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    (faculty_id IN (SELECT id FROM faculty WHERE tuition_id = get_user_tuition_id(auth.uid())))
  );