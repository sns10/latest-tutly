-- Create homework table for tuition admins to assign homework
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tuition_id UUID NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  class TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Tuition admins can manage their homework
CREATE POLICY "Tuition admins can manage their homework"
ON public.homework
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
);

-- Students can view homework for their class
CREATE POLICY "Students can view homework for their class"
ON public.homework
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) AND 
  class IN (SELECT students.class FROM students WHERE students.user_id = auth.uid()) AND
  tuition_id IN (SELECT students.tuition_id FROM students WHERE students.user_id = auth.uid())
);

-- Portal users can view tuition homework
CREATE POLICY "Portal users can view tuition homework"
ON public.homework
FOR SELECT
USING (
  tuition_id IN (SELECT tuitions.id FROM tuitions WHERE tuitions.portal_email = get_user_email())
);