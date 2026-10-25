ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;
UPDATE public.whatsapp_logs SET delivery_status = 'failed' WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS whatsapp_logs_message_id_idx ON public.whatsapp_logs(message_id);
CREATE INDEX IF NOT EXISTS whatsapp_logs_tuition_created_idx ON public.whatsapp_logs(tuition_id, created_at DESC);