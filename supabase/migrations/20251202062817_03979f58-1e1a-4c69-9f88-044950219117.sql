-- =====================================================
-- MULTI-TENANT SAAS ARCHITECTURE MIGRATION
-- =====================================================

-- 1. Create app_role enum for role management
CREATE TYPE public.app_role AS ENUM ('super_admin', 'tuition_admin', 'student', 'parent');

-- 2. Create tuitions table (tenant/organization table)
CREATE TABLE public.tuitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_status TEXT NOT NULL DEFAULT 'active',
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create user_roles table (CRITICAL: Separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, tuition_id)
);

-- 5. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Create function to get user's tuition_id
CREATE OR REPLACE FUNCTION public.get_user_tuition_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tuition_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- 7. Add tuition_id to all existing tables for multi-tenancy
ALTER TABLE public.students ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.divisions ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.weekly_tests ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.subjects ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.faculty ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.timetable ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.challenges ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.class_fees ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;
ALTER TABLE public.academic_materials ADD COLUMN tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE;

-- 8. Create default tuition and migrate existing data
INSERT INTO public.tuitions (id, name, email, is_active, subscription_status, subscription_start_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Tuition Center',
  'demo@example.com',
  true,
  'active',
  now()
);

-- 9. Update all existing records to belong to default tuition
UPDATE public.students SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.divisions SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.weekly_tests SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.subjects SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.faculty SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.timetable SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.announcements SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.challenges SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.class_fees SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;
UPDATE public.academic_materials SET tuition_id = '00000000-0000-0000-0000-000000000001' WHERE tuition_id IS NULL;

-- 10. Make tuition_id NOT NULL after migration
ALTER TABLE public.students ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.divisions ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.weekly_tests ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.subjects ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.faculty ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.timetable ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.announcements ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.challenges ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.class_fees ALTER COLUMN tuition_id SET NOT NULL;
ALTER TABLE public.academic_materials ALTER COLUMN tuition_id SET NOT NULL;

-- 11. Enable RLS on new tables
ALTER TABLE public.tuitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies for tuitions table
CREATE POLICY "Super admins can manage all tuitions"
ON public.tuitions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tuition admins can view their own tuition"
ON public.tuitions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND id = public.get_user_tuition_id(auth.uid())
);

-- 13. RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 14. RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 15. Update RLS policies for multi-tenant isolation on existing tables
-- Students table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.students;
CREATE POLICY "Super admins can manage all students"
ON public.students FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tuition admins can manage their tuition's students"
ON public.students FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
);

CREATE POLICY "Students can view their tuition's data"
ON public.students FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'student') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
);

-- Divisions table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.divisions;
CREATE POLICY "Super admins can manage all divisions"
ON public.divisions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tuition admins can manage their tuition's divisions"
ON public.divisions FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
);

-- Weekly tests table
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.weekly_tests;
CREATE POLICY "Super admins can manage all tests"
ON public.weekly_tests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tuition admins can manage their tuition's tests"
ON public.weekly_tests FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
);

-- Subjects table
DROP POLICY IF EXISTS "Allow read access for subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow insert for subjects" ON public.subjects;
CREATE POLICY "Super admins can manage all subjects"
ON public.subjects FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tuition admins can manage their tuition's subjects"
ON public.subjects FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'tuition_admin') 
  AND tuition_id = public.get_user_tuition_id(auth.uid())
);

-- Apply similar policies to other tables
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.faculty;
CREATE POLICY "Multi-tenant faculty access"
ON public.faculty FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.timetable;
CREATE POLICY "Multi-tenant timetable access"
ON public.timetable FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.announcements;
CREATE POLICY "Multi-tenant announcements access"
ON public.announcements FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.challenges;
CREATE POLICY "Multi-tenant challenges access"
ON public.challenges FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.class_fees;
CREATE POLICY "Multi-tenant class_fees access"
ON public.class_fees FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))
);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.student_attendance;
CREATE POLICY "Multi-tenant attendance access"
ON public.student_attendance FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_attendance.student_id 
    AND students.tuition_id = public.get_user_tuition_id(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_attendance.student_id 
    AND students.tuition_id = public.get_user_tuition_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.student_fees;
CREATE POLICY "Multi-tenant fees access"
ON public.student_fees FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_fees.student_id 
    AND students.tuition_id = public.get_user_tuition_id(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = student_fees.student_id 
    AND students.tuition_id = public.get_user_tuition_id(auth.uid())
  )
);

-- 16. Create trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17. Create indexes for performance
CREATE INDEX idx_profiles_tuition_id ON public.profiles(tuition_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tuition_id ON public.user_roles(tuition_id);
CREATE INDEX idx_students_tuition_id ON public.students(tuition_id);
CREATE INDEX idx_divisions_tuition_id ON public.divisions(tuition_id);
CREATE INDEX idx_weekly_tests_tuition_id ON public.weekly_tests(tuition_id);
CREATE INDEX idx_subjects_tuition_id ON public.subjects(tuition_id);
CREATE INDEX idx_faculty_tuition_id ON public.faculty(tuition_id);