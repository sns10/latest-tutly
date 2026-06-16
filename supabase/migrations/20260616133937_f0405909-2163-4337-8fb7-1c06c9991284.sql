REVOKE EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_mark_attendance(jsonb) TO service_role;