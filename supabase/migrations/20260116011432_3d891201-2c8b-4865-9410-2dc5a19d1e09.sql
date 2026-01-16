-- Allow anonymous users to read tuition info for registration (only active tuitions)
CREATE POLICY "Allow anonymous read for registration"
ON public.tuitions
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous users to read divisions for registration
CREATE POLICY "Allow anonymous read divisions for registration"
ON public.divisions
FOR SELECT
TO anon
USING (
  tuition_id IN (
    SELECT id FROM public.tuitions WHERE is_active = true
  )
);