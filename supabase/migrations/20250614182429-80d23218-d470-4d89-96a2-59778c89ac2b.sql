
-- 1. Table for challenge definitions (same as before)
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'daily', 'weekly', extensibility
  xp_reward INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Table for tracking student participation in challenges (same as before)
CREATE TABLE public.student_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  UNIQUE (student_id, challenge_id)
);

-- 3. Announcements table (same as before)
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  target_class TEXT,
  xp_bonus INTEGER DEFAULT 0
);

-- RLS policies

-- Challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view challenges" ON public.challenges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage challenges" ON public.challenges
  FOR ALL TO authenticated USING (true);

-- Student Challenges: separate policies for UPDATE and DELETE
ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view their student_challenges" ON public.student_challenges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create student_challenges" ON public.student_challenges
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update their own student_challenges" ON public.student_challenges
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete their own student_challenges" ON public.student_challenges
  FOR DELETE TO authenticated USING (true);

-- Announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (true);
