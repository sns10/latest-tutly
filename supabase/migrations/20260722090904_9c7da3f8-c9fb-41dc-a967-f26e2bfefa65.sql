
DROP TABLE IF EXISTS public.academic_materials CASCADE;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_student_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_tuition_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_email() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.setup_tuition_admin(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_fees() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_tuition_admin(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_overdue_fees() TO service_role;

DROP POLICY IF EXISTS "Only super admins can modify roles" ON public.user_roles;
CREATE POLICY "Only super admins can modify roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Backups: super admins can read" ON storage.objects;
DROP POLICY IF EXISTS "Backups: super admins can write" ON storage.objects;
DROP POLICY IF EXISTS "Backups: super admins can update" ON storage.objects;
DROP POLICY IF EXISTS "Backups: super admins can delete" ON storage.objects;
CREATE POLICY "Backups: super admins can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Backups: super admins can write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Backups: super admins can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Backups: super admins can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'super_admin'::app_role));
