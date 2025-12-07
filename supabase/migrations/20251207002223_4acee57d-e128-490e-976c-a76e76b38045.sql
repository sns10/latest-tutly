-- Add email column to students table for portal access linking
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookup by email
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- Update RLS policy to allow students to view other students in their tuition (for leaderboard)
-- This policy already exists based on context, but let's ensure students can see each other
