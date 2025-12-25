-- Fix overly permissive RLS policies on academic_materials table
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow read access for materials" ON public.academic_materials;
DROP POLICY IF EXISTS "Allow insert for materials" ON public.academic_materials;
DROP POLICY IF EXISTS "Allow update for materials" ON public.academic_materials;
DROP POLICY IF EXISTS "Allow delete for materials" ON public.academic_materials;

-- Create proper multi-tenant RLS policies
CREATE POLICY "Multi-tenant materials read access" 
ON public.academic_materials FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid())) OR
  (has_role(auth.uid(), 'student'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
);

CREATE POLICY "Multi-tenant materials insert" 
ON public.academic_materials FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
);

CREATE POLICY "Multi-tenant materials update" 
ON public.academic_materials FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
);

CREATE POLICY "Multi-tenant materials delete" 
ON public.academic_materials FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
);