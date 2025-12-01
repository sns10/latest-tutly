-- Create divisions table
CREATE TABLE public.divisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class, name)
);

-- Enable RLS
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- Create policy for divisions
CREATE POLICY "Allow all for authenticated users"
ON public.divisions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add division_id to students table
ALTER TABLE public.students
ADD COLUMN division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_students_division_id ON public.students(division_id);

-- Insert default divisions for each class (A division for all existing classes)
INSERT INTO public.divisions (class, name)
VALUES 
  ('8th', 'A'),
  ('9th', 'A'),
  ('10th', 'A'),
  ('11th', 'A')
ON CONFLICT (class, name) DO NOTHING;