-- Create a function to set up tuition admin with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.setup_tuition_admin(
  _user_id uuid,
  _tuition_id uuid,
  _full_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update or insert profile with tuition_id
  INSERT INTO public.profiles (id, tuition_id, full_name, created_at, updated_at)
  VALUES (_user_id, _tuition_id, _full_name, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    tuition_id = EXCLUDED.tuition_id,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();

  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, role, tuition_id)
  VALUES (_user_id, 'tuition_admin', _tuition_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Grant execute to authenticated users (will still need to be super_admin to call via RPC)
GRANT EXECUTE ON FUNCTION public.setup_tuition_admin TO authenticated;