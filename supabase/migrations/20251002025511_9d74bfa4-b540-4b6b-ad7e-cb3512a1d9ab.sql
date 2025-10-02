-- Add missing columns to weekly_tests
ALTER TABLE public.weekly_tests ADD COLUMN class TEXT;

-- Add missing columns to challenges
ALTER TABLE public.challenges 
  ADD COLUMN type TEXT,
  ADD COLUMN start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add missing column to student_challenges
ALTER TABLE public.student_challenges ADD COLUMN status TEXT DEFAULT 'completed';

-- Add missing columns to announcements
ALTER TABLE public.announcements 
  ADD COLUMN created_by TEXT,
  ADD COLUMN target_class TEXT,
  ADD COLUMN xp_bonus INTEGER DEFAULT 0;

-- Rename attendance table to student_attendance to match code
ALTER TABLE public.attendance RENAME TO student_attendance;

-- Add missing columns to student_fees
ALTER TABLE public.student_fees 
  ADD COLUMN fee_type TEXT,
  ADD COLUMN notes TEXT;