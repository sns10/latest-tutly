CREATE TABLE public.whatsapp_scheduled_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tuition_id uuid NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  template text NOT NULL CHECK (template IN ('fee_reminder_v1','test_result_v1','absence_alert_v1')),
  title text NOT NULL DEFAULT '',
  scheduled_date date NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','cancelled','failed')),
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);
CREATE INDEX idx_wa_sched_pending ON public.whatsapp_scheduled_dispatches (status, scheduled_date);
CREATE INDEX idx_wa_sched_tuition ON public.whatsapp_scheduled_dispatches (tuition_id, scheduled_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_scheduled_dispatches TO authenticated;
GRANT ALL ON public.whatsapp_scheduled_dispatches TO service_role;
ALTER TABLE public.whatsapp_scheduled_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own center schedules" ON public.whatsapp_scheduled_dispatches FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid())));
CREATE POLICY "Staff create own center schedules" ON public.whatsapp_scheduled_dispatches FOR INSERT TO authenticated
WITH CHECK (status = 'pending' AND (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))));
CREATE POLICY "Staff cancel pending schedules" ON public.whatsapp_scheduled_dispatches FOR UPDATE TO authenticated
USING (status = 'pending' AND (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))))
WITH CHECK (status IN ('pending','cancelled') AND (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))));
CREATE POLICY "Staff delete non-running schedules" ON public.whatsapp_scheduled_dispatches FOR DELETE TO authenticated
USING (status <> 'processing' AND (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'tuition_admin') AND tuition_id = public.get_user_tuition_id(auth.uid()))));

CREATE OR REPLACE FUNCTION public.validate_wa_schedule()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.scheduled_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
      RAISE EXCEPTION 'Scheduled date must be after today';
    END IF;
    IF jsonb_typeof(NEW.messages) <> 'array' OR jsonb_array_length(NEW.messages) = 0 OR jsonb_array_length(NEW.messages) > 1000 THEN
      RAISE EXCEPTION 'A schedule needs between 1 and 1000 recipients';
    END IF;
    NEW.recipient_count := jsonb_array_length(NEW.messages);
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_wa_schedule BEFORE INSERT ON public.whatsapp_scheduled_dispatches
FOR EACH ROW EXECUTE FUNCTION public.validate_wa_schedule();