-- Add missing updated_at column to student_attendance
ALTER TABLE public.student_attendance ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();