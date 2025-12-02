-- Add user_id to students table to link students with user accounts
ALTER TABLE public.students
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_students_user_id ON public.students(user_id);

-- Update RLS policies for students to view their own data
CREATE POLICY "Students can view their own record"
ON public.students
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update RLS policies for student_attendance
CREATE POLICY "Students can view their own attendance"
ON public.student_attendance
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- Update RLS policies for student_test_results
CREATE POLICY "Students can view their own test results"
ON public.student_test_results
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- Update RLS policies for student_fees
CREATE POLICY "Students can view their own fees"
ON public.student_fees
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- Update RLS policies for announcements
CREATE POLICY "Students can view announcements for their class"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role) AND
  (
    target_class IS NULL OR
    target_class IN (
      SELECT class FROM public.students WHERE user_id = auth.uid()
    )
  ) AND
  tuition_id IN (
    SELECT tuition_id FROM public.students WHERE user_id = auth.uid()
  )
);