-- Drop the old constraint that causes the conflict
ALTER TABLE public.student_attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;

-- Drop any existing index on the same columns
DROP INDEX IF EXISTS idx_student_attendance_unique;

-- Create a new unique index that handles null values properly using COALESCE
CREATE UNIQUE INDEX idx_student_attendance_unique 
ON public.student_attendance (
  student_id, 
  date, 
  COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid), 
  COALESCE(faculty_id, '00000000-0000-0000-0000-000000000000'::uuid)
);