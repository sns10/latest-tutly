ALTER TABLE public.weekly_tests ADD COLUMN IF NOT EXISTS division_id uuid;
CREATE INDEX IF NOT EXISTS idx_weekly_tests_division_id ON public.weekly_tests(division_id);