
-- Create a function to auto-assign tuition_admin role when profile's tuition_id is set
CREATE OR REPLACE FUNCTION public.auto_assign_tuition_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when tuition_id changes from NULL to a value
  IF NEW.tuition_id IS NOT NULL AND (OLD.tuition_id IS NULL OR OLD.tuition_id != NEW.tuition_id) THEN
    -- Check if user already has a role for this tuition
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.id AND tuition_id = NEW.tuition_id
    ) THEN
      -- Assign tuition_admin role by default
      INSERT INTO public.user_roles (user_id, role, tuition_id)
      VALUES (NEW.id, 'tuition_admin', NEW.tuition_id)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_tuition_assigned ON public.profiles;
CREATE TRIGGER on_profile_tuition_assigned
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_tuition_admin_role();
