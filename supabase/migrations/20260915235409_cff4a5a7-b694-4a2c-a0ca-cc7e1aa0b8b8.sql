ALTER TABLE public.tuitions
  ADD COLUMN IF NOT EXISTS salary_payout_mode text NOT NULL DEFAULT 'monthly';

CREATE TABLE public.faculty_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tuition_id uuid NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  class text NOT NULL,
  hourly_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, class)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_rates TO authenticated;
GRANT ALL ON public.faculty_rates TO service_role;
ALTER TABLE public.faculty_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tuition staff manage faculty rates"
ON public.faculty_rates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR tuition_id = public.get_user_tuition_id(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR tuition_id = public.get_user_tuition_id(auth.uid()));

CREATE TABLE public.faculty_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tuition_id uuid NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  class text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  hours numeric NOT NULL DEFAULT 1.5,
  hourly_rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_faculty_sessions_tuition_date ON public.faculty_sessions (tuition_id, session_date);
CREATE INDEX idx_faculty_sessions_faculty_date ON public.faculty_sessions (faculty_id, session_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_sessions TO authenticated;
GRANT ALL ON public.faculty_sessions TO service_role;
ALTER TABLE public.faculty_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tuition staff manage faculty sessions"
ON public.faculty_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR tuition_id = public.get_user_tuition_id(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR tuition_id = public.get_user_tuition_id(auth.uid()));

CREATE TABLE public.faculty_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tuition_id uuid NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.faculty_sessions(id) ON DELETE SET NULL,
  salary_month date,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  payment_reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_faculty_payments_tuition_date ON public.faculty_payments (tuition_id, payment_date);
CREATE INDEX idx_faculty_payments_faculty ON public.faculty_payments (faculty_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_payments TO authenticated;
GRANT ALL ON public.faculty_payments TO service_role;
ALTER TABLE public.faculty_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tuition staff manage faculty payments"
ON public.faculty_payments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR tuition_id = public.get_user_tuition_id(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR tuition_id = public.get_user_tuition_id(auth.uid()));

CREATE TRIGGER update_faculty_rates_updated_at BEFORE UPDATE ON public.faculty_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faculty_sessions_updated_at BEFORE UPDATE ON public.faculty_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faculty_payments_updated_at BEFORE UPDATE ON public.faculty_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();