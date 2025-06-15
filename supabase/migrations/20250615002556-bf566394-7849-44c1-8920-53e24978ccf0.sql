
-- Update RLS policies for weekly_tests table to allow authenticated users
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view weekly tests" ON public.weekly_tests;
DROP POLICY IF EXISTS "Users can create weekly tests" ON public.weekly_tests;
DROP POLICY IF EXISTS "Users can update weekly tests" ON public.weekly_tests;
DROP POLICY IF EXISTS "Users can delete weekly tests" ON public.weekly_tests;
DROP POLICY IF EXISTS "Authenticated users can view weekly tests" ON public.weekly_tests;
DROP POLICY IF EXISTS "Authenticated users can create weekly tests" ON public.weekly_tests;
DROP POLICY IF EXISTS "Authenticated users can update weekly tests" ON public.weekly_tests;
DROP POLICY IF EXISTS "Authenticated users can delete weekly tests" ON public.weekly_tests;

-- Create new policies that allow authenticated users to manage weekly tests
CREATE POLICY "Authenticated users can view weekly tests" 
  ON public.weekly_tests 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create weekly tests" 
  ON public.weekly_tests 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update weekly tests" 
  ON public.weekly_tests 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete weekly tests" 
  ON public.weekly_tests 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Update students table policies 
DROP POLICY IF EXISTS "Users can view students" ON public.students;
DROP POLICY IF EXISTS "Users can create students" ON public.students;
DROP POLICY IF EXISTS "Users can update students" ON public.students;
DROP POLICY IF EXISTS "Users can delete students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can create students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;

CREATE POLICY "Authenticated users can view students" 
  ON public.students 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create students" 
  ON public.students 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update students" 
  ON public.students 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete students" 
  ON public.students 
  FOR DELETE 
  USING (auth.role() = 'authenticated');
