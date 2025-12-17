-- Create tuition_backups table for storing backup records
CREATE TABLE public.tuition_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tuition_id UUID NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  backup_data JSONB NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tuition_backups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Super admins can manage all backups"
ON public.tuition_backups FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tuition admins can manage their backups"
ON public.tuition_backups FOR ALL
USING (has_role(auth.uid(), 'tuition_admin') AND tuition_id = get_user_tuition_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'tuition_admin') AND tuition_id = get_user_tuition_id(auth.uid()));

-- Create audit_logs table for activity tracking
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tuition_id UUID REFERENCES public.tuitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tuition admins can view their audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'tuition_admin') AND tuition_id = get_user_tuition_id(auth.uid()));

-- Index for better query performance
CREATE INDEX idx_audit_logs_tuition_id ON public.audit_logs(tuition_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_tuition_backups_tuition_id ON public.tuition_backups(tuition_id);