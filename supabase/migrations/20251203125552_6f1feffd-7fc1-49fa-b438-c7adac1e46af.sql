-- Add unique constraint on student_attendance for upsert to work
-- This allows marking attendance for the same student on the same date with different subject/faculty combinations
CREATE UNIQUE INDEX IF NOT EXISTS student_attendance_unique_idx 
ON student_attendance (student_id, date, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'), COALESCE(faculty_id, '00000000-0000-0000-0000-000000000000'));

-- Drop the old constraint if it exists and add a proper one
ALTER TABLE student_attendance 
DROP CONSTRAINT IF EXISTS student_attendance_student_date_unique;

-- Add a constraint that handles null values properly
ALTER TABLE student_attendance
ADD CONSTRAINT student_attendance_student_date_subject_faculty_unique 
UNIQUE (student_id, date, subject_id, faculty_id);