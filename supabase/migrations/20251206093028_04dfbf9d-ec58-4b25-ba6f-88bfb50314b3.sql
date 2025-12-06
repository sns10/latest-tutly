-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create term_exams table for term-wise examination periods
CREATE TABLE public.term_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  term TEXT NOT NULL CHECK (term IN ('1st Term', '2nd Term', '3rd Term')),
  class TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  tuition_id UUID NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create term_exam_subjects table to link subjects to term exams with max marks
CREATE TABLE public.term_exam_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_exam_id UUID NOT NULL REFERENCES public.term_exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  max_marks INTEGER NOT NULL DEFAULT 100,
  exam_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(term_exam_id, subject_id)
);

-- Create term_exam_results table for student marks per subject
CREATE TABLE public.term_exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_exam_id UUID NOT NULL REFERENCES public.term_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  marks INTEGER,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(term_exam_id, student_id, subject_id)
);

-- Enable RLS on all tables
ALTER TABLE public.term_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_exam_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for term_exams
CREATE POLICY "Super admins can manage all term exams"
ON public.term_exams FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tuition admins can manage their term exams"
ON public.term_exams FOR ALL
USING (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()));

-- RLS policies for term_exam_subjects
CREATE POLICY "Super admins can manage all term exam subjects"
ON public.term_exam_subjects FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tuition admins can manage their term exam subjects"
ON public.term_exam_subjects FOR ALL
USING (has_role(auth.uid(), 'tuition_admin'::app_role) AND term_exam_id IN (
  SELECT id FROM public.term_exams WHERE tuition_id = get_user_tuition_id(auth.uid())
))
WITH CHECK (has_role(auth.uid(), 'tuition_admin'::app_role) AND term_exam_id IN (
  SELECT id FROM public.term_exams WHERE tuition_id = get_user_tuition_id(auth.uid())
));

-- RLS policies for term_exam_results
CREATE POLICY "Super admins can manage all term exam results"
ON public.term_exam_results FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tuition admins can manage their term exam results"
ON public.term_exam_results FOR ALL
USING (has_role(auth.uid(), 'tuition_admin'::app_role) AND term_exam_id IN (
  SELECT id FROM public.term_exams WHERE tuition_id = get_user_tuition_id(auth.uid())
))
WITH CHECK (has_role(auth.uid(), 'tuition_admin'::app_role) AND term_exam_id IN (
  SELECT id FROM public.term_exams WHERE tuition_id = get_user_tuition_id(auth.uid())
));

CREATE POLICY "Students can view their own term exam results"
ON public.term_exam_results FOR SELECT
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

-- Create updated_at trigger for term_exams
CREATE TRIGGER update_term_exams_updated_at
BEFORE UPDATE ON public.term_exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for term_exam_results
CREATE TRIGGER update_term_exam_results_updated_at
BEFORE UPDATE ON public.term_exam_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();