
-- Create enum types for better data integrity
CREATE TYPE class_name AS ENUM ('8th', '9th', '10th', '11th', 'All');
CREATE TYPE team_name AS ENUM ('Alpha', 'Bravo', 'Charlie');
CREATE TYPE xp_category AS ENUM ('blackout', 'futureMe', 'recallWar');

-- Create profiles table for authenticated users (teachers/admins)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class class_name NOT NULL,
  avatar TEXT,
  team team_name,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_xp table to track XP by category
CREATE TABLE public.student_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category xp_category NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, category)
);

-- Create badges table for badge definitions
CREATE TABLE public.badges (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL
);

-- Create student_badges table to track earned badges
CREATE TABLE public.student_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id),
  date_earned TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, badge_id)
);

-- Create rewards table for reward definitions
CREATE TABLE public.rewards (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL
);

-- Create student_rewards table for purchased rewards
CREATE TABLE public.student_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL REFERENCES public.rewards(id),
  instance_id TEXT NOT NULL UNIQUE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weekly_tests table
CREATE TABLE public.weekly_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  max_marks INTEGER NOT NULL,
  test_date DATE NOT NULL,
  class class_name NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_test_results table
CREATE TABLE public.student_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.weekly_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_id, student_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (teachers/admins)
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Students policies (allow all authenticated users to manage students)
CREATE POLICY "Authenticated users can view students" ON public.students
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create students" ON public.students
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update students" ON public.students
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete students" ON public.students
  FOR DELETE TO authenticated USING (true);

-- Student XP policies
CREATE POLICY "Authenticated users can view student XP" ON public.student_xp
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage student XP" ON public.student_xp
  FOR ALL TO authenticated USING (true);

-- Badges policies (read-only for most, but allow inserts for seeding)
CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create badges" ON public.badges
  FOR INSERT TO authenticated WITH CHECK (true);

-- Student badges policies
CREATE POLICY "Authenticated users can view student badges" ON public.student_badges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage student badges" ON public.student_badges
  FOR ALL TO authenticated USING (true);

-- Rewards policies
CREATE POLICY "Anyone can view rewards" ON public.rewards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create rewards" ON public.rewards
  FOR INSERT TO authenticated WITH CHECK (true);

-- Student rewards policies
CREATE POLICY "Authenticated users can view student rewards" ON public.student_rewards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage student rewards" ON public.student_rewards
  FOR ALL TO authenticated USING (true);

-- Weekly tests policies
CREATE POLICY "Authenticated users can view tests" ON public.weekly_tests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage tests" ON public.weekly_tests
  FOR ALL TO authenticated USING (true);

-- Test results policies
CREATE POLICY "Authenticated users can view test results" ON public.student_test_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage test results" ON public.student_test_results
  FOR ALL TO authenticated USING (true);

-- Create trigger function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default badges
INSERT INTO public.badges (id, name, description, emoji) VALUES
  ('first-100-xp', 'Century Club', 'Earned over 100 XP', '💯'),
  ('mvp-of-the-week', 'MVP of the Week', 'Top performer this week', '🏆'),
  ('team-player', 'Team Player', 'Great team collaboration', '🤝'),
  ('streak-master', 'Streak Master', 'Maintained learning streak', '🔥')
ON CONFLICT (id) DO NOTHING;

-- Insert default rewards
INSERT INTO public.rewards (id, name, cost, description, emoji) VALUES
  ('streak-freeze', 'Streak Freeze', 50, 'Protect your streak for one day', '❄️'),
  ('recall-shield', 'Recall Shield', 75, 'Extra protection in Recall War', '🛡️'),
  ('double-xp', 'Double XP', 100, 'Double XP for next activity', '⚡'),
  ('question-master', 'Question Master', 150, 'Skip one difficult question', '🎯')
ON CONFLICT (id) DO NOTHING;
