-- Add policies to prevent anonymous access to sensitive tables

-- 1. FACULTY TABLE: Add policy to require authentication
-- Drop and recreate to ensure no anonymous access
DROP POLICY IF EXISTS "Multi-tenant faculty access" ON public.faculty;

CREATE POLICY "Authenticated users with roles can manage faculty"
ON public.faculty
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    (has_role(auth.uid(), 'tuition_admin'::app_role) AND (tuition_id = get_user_tuition_id(auth.uid())))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    (has_role(auth.uid(), 'tuition_admin'::app_role) AND (tuition_id = get_user_tuition_id(auth.uid())))
  )
);

-- 2. STUDENT_FEES TABLE: Add explicit auth check
DROP POLICY IF EXISTS "Multi-tenant fees access" ON public.student_fees;

CREATE POLICY "Authenticated admins can manage fees"
ON public.student_fees
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    (has_role(auth.uid(), 'tuition_admin'::app_role) AND EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = student_fees.student_id 
      AND students.tuition_id = get_user_tuition_id(auth.uid())
    ))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    (has_role(auth.uid(), 'tuition_admin'::app_role) AND EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = student_fees.student_id 
      AND students.tuition_id = get_user_tuition_id(auth.uid())
    ))
  )
);

-- Update portal user policy to require auth
DROP POLICY IF EXISTS "Portal users can view tuition fees" ON public.student_fees;

CREATE POLICY "Authenticated portal users can view tuition fees"
ON public.student_fees
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  student_id IN (
    SELECT s.id FROM students s
    JOIN tuitions t ON s.tuition_id = t.id
    WHERE t.portal_email = get_user_email()
  )
);

-- Update student policy to require auth
DROP POLICY IF EXISTS "Students can view their own fees" ON public.student_fees;

CREATE POLICY "Authenticated students can view their own fees"
ON public.student_fees
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  student_id IN (
    SELECT students.id FROM students WHERE students.user_id = auth.uid()
  )
);

-- 3. AUDIT_LOGS TABLE: Add explicit denial for anonymous users and ensure auth check
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Tuition admins can view their audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated super admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated tuition admins can view their audit logs"
ON public.audit_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'tuition_admin'::app_role) AND 
  tuition_id = get_user_tuition_id(auth.uid())
);