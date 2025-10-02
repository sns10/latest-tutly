-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create academic_materials table for storing file information
CREATE TABLE public.academic_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('notes', 'pyq')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_materials ENABLE ROW LEVEL SECURITY;

-- Create policies for subjects (read access for all authenticated users)
CREATE POLICY "Allow read access for subjects" 
  ON public.subjects 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow insert for subjects" 
  ON public.subjects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create policies for academic_materials (read access for all, upload for authenticated)
CREATE POLICY "Allow read access for materials" 
  ON public.academic_materials 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow insert for materials" 
  ON public.academic_materials 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow update for materials" 
  ON public.academic_materials 
  FOR UPDATE 
  TO authenticated 
  USING (uploaded_by = auth.uid());

CREATE POLICY "Allow delete for materials" 
  ON public.academic_materials 
  FOR DELETE 
  TO authenticated 
  USING (uploaded_by = auth.uid());

-- Insert subjects for all classes
INSERT INTO public.subjects (name, class) VALUES
  -- 8th class subjects
  ('Mathematics', '8th'),
  ('Physics', '8th'),
  ('Chemistry', '8th'),
  ('Biology', '8th'),
  ('Geography', '8th'),
  ('History', '8th'),
  ('English', '8th'),
  ('Malayalam-1', '8th'),
  ('Malayalam-2', '8th'),
  ('Hindi', '8th'),
  
  -- 9th class subjects
  ('Mathematics', '9th'),
  ('Physics', '9th'),
  ('Chemistry', '9th'),
  ('Biology', '9th'),
  ('Geography', '9th'),
  ('History', '9th'),
  ('English', '9th'),
  ('Malayalam-1', '9th'),
  ('Malayalam-2', '9th'),
  ('Hindi', '9th'),
  
  -- 10th class subjects
  ('Mathematics', '10th'),
  ('Physics', '10th'),
  ('Chemistry', '10th'),
  ('Biology', '10th'),
  ('Geography', '10th'),
  ('History', '10th'),
  ('English', '10th'),
  ('Malayalam-1', '10th'),
  ('Malayalam-2', '10th'),
  ('Hindi', '10th'),
  
  -- 11th class subjects
  ('Mathematics', '11th'),
  ('Physics', '11th'),
  ('Chemistry', '11th'),
  ('Biology', '11th'),
  ('Geography', '11th'),
  ('History', '11th'),
  ('English', '11th'),
  ('Malayalam-1', '11th'),
  ('Malayalam-2', '11th'),
  ('Hindi', '11th');

-- Create storage bucket for academic materials
INSERT INTO storage.buckets (id, name, public) 
VALUES ('academic-materials', 'academic-materials', true);

-- Create storage policies for the bucket
CREATE POLICY "Allow authenticated uploads" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'academic-materials');

CREATE POLICY "Allow public downloads" 
  ON storage.objects 
  FOR SELECT 
  TO public 
  USING (bucket_id = 'academic-materials');

CREATE POLICY "Allow authenticated users to delete their own files" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'academic-materials' AND auth.uid()::text = (storage.foldername(name))[1]);