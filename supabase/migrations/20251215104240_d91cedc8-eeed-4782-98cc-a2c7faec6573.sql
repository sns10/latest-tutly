-- Fix RLS infinite recursion: avoid tuitions<->students policy cycle

-- Remove the problematic policy that referenced students from within tuitions
DROP POLICY IF EXISTS "Students can view their own tuition" ON public.tuitions;

-- Allow authenticated student users to read ONLY their tuition row using a SECURITY DEFINER function
-- (reads profiles only, so it won't recurse through students/tuitions policies)
CREATE POLICY "Students can view their tuition"
ON public.tuitions
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND id = get_user_tuition_id(auth.uid())
);
