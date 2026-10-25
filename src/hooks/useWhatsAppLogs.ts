import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppLog {
  id: string;
  student_id: string | null;
  template_name: string;
  recipient: string;
  status: string;
  delivery_status: string;
  message_id: string | null;
  error_message: string | null;
  error_code: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
}

/** Recent WhatsApp sends for a center, refreshed every 15s while enabled. */
export function useWhatsAppLogs(tuitionId: string | null | undefined, enabled = true, since?: string) {
  return useQuery({
    queryKey: ['whatsappLogs', tuitionId, since ?? null],
    enabled: !!tuitionId && enabled,
    refetchInterval: enabled ? 15000 : false,
    staleTime: 5000,
    queryFn: async () => {
      let q = supabase
        .from('whatsapp_logs')
        .select('id, student_id, template_name, recipient, status, delivery_status, message_id, error_message, error_code, created_at, delivered_at, read_at, failed_at')
        .eq('tuition_id', tuitionId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (since) q = q.gte('created_at', since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WhatsAppLog[];
    },
  });
}
