-- Per-center WhatsApp Cloud API settings (managed by super admin only)
CREATE TABLE IF NOT EXISTS public.tuition_whatsapp_settings (
  tuition_id uuid PRIMARY KEY REFERENCES public.tuitions(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  -- Name of the server secret holding this center's WhatsApp connection key.
  -- NULL = use the shared platform number (WHATSAPP_API_KEY).
  sender_secret_name text,
  display_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sender_secret_name_format CHECK (
    sender_secret_name IS NULL OR sender_secret_name ~ '^WHATSAPP_API_KEY(_[0-9]+)?$'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tuition_whatsapp_settings TO authenticated;
GRANT ALL ON public.tuition_whatsapp_settings TO service_role;

ALTER TABLE public.tuition_whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages whatsapp settings"
  ON public.tuition_whatsapp_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tuition staff read own whatsapp settings"
  ON public.tuition_whatsapp_settings FOR SELECT TO authenticated
  USING (tuition_id = public.get_user_tuition_id(auth.uid()));

CREATE TRIGGER update_tuition_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.tuition_whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log of every automated WhatsApp send
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tuition_id uuid NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  message_id text,
  error_message text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_logs_tuition_created_idx
  ON public.whatsapp_logs (tuition_id, created_at DESC);

GRANT SELECT ON public.whatsapp_logs TO authenticated;
GRANT ALL ON public.whatsapp_logs TO service_role;

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read whatsapp logs for own tuition"
  ON public.whatsapp_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR tuition_id = public.get_user_tuition_id(auth.uid())
  );
