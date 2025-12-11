-- Add roll_no column to students table
ALTER TABLE public.students 
ADD COLUMN roll_no integer;

-- Create index for efficient sorting by roll_no
CREATE INDEX idx_students_roll_no ON public.students(roll_no);

-- Auto-assign roll numbers to existing students by alphabetic order within each class and division
WITH ranked_students AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tuition_id, class, division_id 
      ORDER BY name ASC
    ) as new_roll_no
  FROM public.students
)
UPDATE public.students s
SET roll_no = rs.new_roll_no
FROM ranked_students rs
WHERE s.id = rs.id;