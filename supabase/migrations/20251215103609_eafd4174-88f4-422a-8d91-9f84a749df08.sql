-- Allow authenticated students/linked users to view their own tuition row (for branding in student portal)
CREATE POLICY "Students can view their own tuition"
ON public.tuitions
FOR SELECT
USING (
  id IN (
    SELECT s.tuition_id
    FROM public.students s
    WHERE s.user_id = auth.uid()
  )
);