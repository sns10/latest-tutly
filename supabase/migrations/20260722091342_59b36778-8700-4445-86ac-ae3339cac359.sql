DROP POLICY IF EXISTS "Only super admins can modify roles" ON public.user_roles;
CREATE POLICY "Only super admins can modify roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (
    -- Allow reads for everyone authenticated (row-level SELECT still gated by permissive policy)
    (current_setting('request.method', true) = 'GET')
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
)
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));