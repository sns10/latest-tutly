-- Add portal_email column to tuitions for shared student portal access
ALTER TABLE public.tuitions ADD COLUMN IF NOT EXISTS portal_email text;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_tuitions_portal_email ON public.tuitions(portal_email);

-- Allow students with portal access to view students from their tuition
CREATE POLICY "Portal users can view tuition students"
ON public.students
FOR SELECT
USING (
  tuition_id IN (
    SELECT id FROM public.tuitions 
    WHERE portal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow portal users to view their tuition info
CREATE POLICY "Portal users can view their tuition"
ON public.tuitions
FOR SELECT
USING (portal_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow portal users to view attendance for students in their tuition
CREATE POLICY "Portal users can view tuition attendance"
ON public.student_attendance
FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.tuitions t ON s.tuition_id = t.id
    WHERE t.portal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow portal users to view test results
CREATE POLICY "Portal users can view tuition test results"
ON public.student_test_results
FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.tuitions t ON s.tuition_id = t.id
    WHERE t.portal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow portal users to view fees
CREATE POLICY "Portal users can view tuition fees"
ON public.student_fees
FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.tuitions t ON s.tuition_id = t.id
    WHERE t.portal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow portal users to view announcements
CREATE POLICY "Portal users can view tuition announcements"
ON public.announcements
FOR SELECT
USING (
  tuition_id IN (
    SELECT id FROM public.tuitions 
    WHERE portal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow portal users to view subjects
CREATE POLICY "Portal users can view tuition subjects"
ON public.subjects
FOR SELECT
USING (
  tuition_id IN (
    SELECT id FROM public.tuitions 
    WHERE portal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow portal users to view weekly tests
CREATE POLICY "Portal users can view tuition tests"
ON public.weekly_tests
FOR SELECT
USING (
  tuition_id IN (
    SELECT id FROM public.tuitions 
    WHERE portal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);