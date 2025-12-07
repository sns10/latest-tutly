-- Create function to auto-assign student role when user_id is linked to a student record
CREATE OR REPLACE FUNCTION public.auto_assign_student_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when user_id changes from NULL to a value
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
    -- Check if user already has a student role for this tuition
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.user_id AND tuition_id = NEW.tuition_id AND role = 'student'
    ) THEN
      -- Assign student role
      INSERT INTO public.user_roles (user_id, role, tuition_id)
      VALUES (NEW.user_id, 'student', NEW.tuition_id)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Also update the user's profile tuition_id if not set
      UPDATE public.profiles 
      SET tuition_id = NEW.tuition_id, updated_at = now()
      WHERE id = NEW.user_id AND tuition_id IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on students table
DROP TRIGGER IF EXISTS on_student_user_linked ON public.students;
CREATE TRIGGER on_student_user_linked
  AFTER UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_student_role();