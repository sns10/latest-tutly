-- Add division_id to timetable table
ALTER TABLE public.timetable 
ADD COLUMN division_id uuid REFERENCES public.divisions(id);

-- Create index for better query performance
CREATE INDEX idx_timetable_division_id ON public.timetable(division_id);