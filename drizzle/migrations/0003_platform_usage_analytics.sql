CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages platform settings" ON public.platform_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
INSERT INTO public.platform_settings (key, value) VALUES ('whatsapp_rate_inr', '0.115'::jsonb) ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.whatsapp_scheduled_dispatches
  ADD COLUMN IF NOT EXISTS progress_offset integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_logs_tuition_tpl_created ON public.whatsapp_logs (tuition_id, template_name, created_at);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance (date);

CREATE OR REPLACE FUNCTION public.get_whatsapp_stats(_tuition_id uuid, _from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin')
    OR (public.has_role(auth.uid(),'tuition_admin') AND _tuition_id = public.get_user_tuition_id(auth.uid()))) THEN
    RAISE EXCEPTION 'access denied';
  END IF;
  WITH l AS (
    SELECT * FROM whatsapp_logs WHERE tuition_id = _tuition_id AND created_at >= _from AND created_at < _to
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM l),
    'delivered', (SELECT count(*) FROM l WHERE delivery_status IN ('delivered','read')),
    'read', (SELECT count(*) FROM l WHERE delivery_status = 'read'),
    'failed', (SELECT count(*) FROM l WHERE delivery_status = 'failed'),
    'by_template', COALESCE((SELECT jsonb_object_agg(template_name, c) FROM (SELECT template_name, count(*) c FROM l GROUP BY 1) t), '{}'::jsonb),
    'by_day', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', d, 'sent', c, 'failed', f) ORDER BY d) FROM (
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date d, count(*) c, count(*) FILTER (WHERE delivery_status='failed') f FROM l GROUP BY 1) t), '[]'::jsonb),
    'failure_reasons', COALESCE((SELECT jsonb_agg(jsonb_build_object('reason', r, 'count', c) ORDER BY c DESC) FROM (
        SELECT COALESCE(error_message,'Unknown reason') r, count(*) c FROM l WHERE delivery_status='failed' GROUP BY 1 ORDER BY 2 DESC LIMIT 10) t), '[]'::jsonb),
    'pending_schedules', (SELECT count(*) FROM whatsapp_scheduled_dispatches WHERE tuition_id = _tuition_id AND status = 'pending')
  ) INTO v;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.get_platform_usage(_month date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m_start date := date_trunc('month', _month)::date;
  m_end date := (date_trunc('month', _month) + interval '1 month')::date;
  ts_start timestamptz := (m_start::timestamp AT TIME ZONE 'Asia/Kolkata');
  ts_end timestamptz := (m_end::timestamp AT TIME ZONE 'Asia/Kolkata');
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'access denied'; END IF;
  WITH
  st AS (SELECT tuition_id, count(*) c FROM students GROUP BY 1),
  fa AS (SELECT tuition_id, count(*) c FROM faculty GROUP BY 1),
  ad AS (SELECT tuition_id, count(*) c FROM user_roles WHERE role='tuition_admin' GROUP BY 1),
  wa AS (SELECT tuition_id, count(*) total,
           count(*) FILTER (WHERE delivery_status IN ('delivered','read')) delivered,
           count(*) FILTER (WHERE delivery_status='read') rd,
           count(*) FILTER (WHERE delivery_status='failed') failed,
           count(*) FILTER (WHERE template_name='fee_reminder_v1') fee,
           count(*) FILTER (WHERE template_name='test_result_v1') test,
           count(*) FILTER (WHERE template_name='absence_alert_v1') absence,
           max(created_at) last_at
         FROM whatsapp_logs WHERE created_at >= ts_start AND created_at < ts_end GROUP BY 1),
  sc AS (SELECT tuition_id, count(*) c FROM whatsapp_scheduled_dispatches WHERE status='pending' GROUP BY 1),
  att AS (SELECT s.tuition_id, count(*) c, max(sa.updated_at) last_at FROM student_attendance sa JOIN students s ON s.id = sa.student_id
          WHERE sa.date >= m_start AND sa.date < m_end GROUP BY 1),
  te AS (SELECT tuition_id, count(*) c, max(created_at) last_at FROM weekly_tests WHERE test_date >= m_start AND test_date < m_end GROUP BY 1),
  fp AS (SELECT s.tuition_id, count(*) c, COALESCE(sum(p.amount),0) amt, max(p.created_at) last_at FROM fee_payments p
          JOIN student_fees f ON f.id = p.fee_id JOIN students s ON s.id = f.student_id
          WHERE p.payment_date >= m_start AND p.payment_date < m_end GROUP BY 1)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tuition_id', t.id, 'name', t.name, 'is_active', t.is_active, 'subscription_status', t.subscription_status,
    'whatsapp_enabled', COALESCE(ws.is_enabled, false),
    'students', COALESCE(st.c,0), 'faculty', COALESCE(fa.c,0), 'admins', COALESCE(ad.c,0),
    'wa_total', COALESCE(wa.total,0), 'wa_delivered', COALESCE(wa.delivered,0), 'wa_read', COALESCE(wa.rd,0),
    'wa_failed', COALESCE(wa.failed,0), 'wa_fee', COALESCE(wa.fee,0), 'wa_test', COALESCE(wa.test,0), 'wa_absence', COALESCE(wa.absence,0),
    'pending_schedules', COALESCE(sc.c,0),
    'attendance_marks', COALESCE(att.c,0), 'tests_created', COALESCE(te.c,0),
    'payments_recorded', COALESCE(fp.c,0), 'payments_amount', COALESCE(fp.amt,0),
    'last_activity', GREATEST(wa.last_at, att.last_at, te.last_at, fp.last_at)
  ) ORDER BY t.name), '[]'::jsonb)
  INTO v
  FROM tuitions t
  LEFT JOIN tuition_whatsapp_settings ws ON ws.tuition_id = t.id
  LEFT JOIN st ON st.tuition_id = t.id LEFT JOIN fa ON fa.tuition_id = t.id LEFT JOIN ad ON ad.tuition_id = t.id
  LEFT JOIN wa ON wa.tuition_id = t.id LEFT JOIN sc ON sc.tuition_id = t.id LEFT JOIN att ON att.tuition_id = t.id
  LEFT JOIN te ON te.tuition_id = t.id LEFT JOIN fp ON fp.tuition_id = t.id;
  RETURN v;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_platform_usage(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_whatsapp_stats(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_usage(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_stats(uuid, timestamptz, timestamptz) TO authenticated;