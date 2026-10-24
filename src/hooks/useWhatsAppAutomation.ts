import { useQuery, useMutation } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';

export type WhatsAppTemplate = 'fee_reminder_v1' | 'test_result_v1' | 'absence_alert_v1';

export interface WhatsAppItem {
  student_id: string;
  amount?: string;
  due_date?: string;
  subject?: string;
  date?: string;
  marks?: string;
  total?: string;
}

export interface WhatsAppSendResult {
  sent: number;
  failed: number;
  results: { student_id: string; ok: boolean; error?: string }[];
}

/** Formats a date like "5 Nov 2026" to match the approved templates. */
export function formatWhatsAppDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Whether the super admin has switched on automated WhatsApp for this center. */
export function useWhatsAppAutomation() {
  const { tuitionId } = useUserTuition();
  const { data } = useQuery({
    queryKey: ['whatsappSettings', tuitionId],
    enabled: !!tuitionId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tuition_whatsapp_settings')
        .select('is_enabled, display_number')
        .eq('tuition_id', tuitionId)
        .maybeSingle();
      if (error) throw error;
      return data as { is_enabled: boolean; display_number: string | null } | null;
    },
  });

  const send = useMutation({
    mutationFn: async ({ template, messages }: { template: WhatsAppTemplate; messages: WhatsAppItem[] }) => {
      const all: WhatsAppSendResult = { sent: 0, failed: 0, results: [] };
      for (let i = 0; i < messages.length; i += 200) {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: { template, messages: messages.slice(i, i + 200) },
        });
        if (error) {
          let details = error.message;
          if (error instanceof FunctionsHttpError) {
            try {
              const body = await error.context.json();
              details = typeof body?.error === 'string' ? body.error : JSON.stringify(body?.error ?? body);
            } catch { /* keep */ }
          }
          throw new Error(details);
        }
        const r = data as WhatsAppSendResult;
        all.sent += r.sent;
        all.failed += r.failed;
        all.results.push(...r.results);
      }
      return all;
    },
  });

  return { enabled: !!data?.is_enabled, displayNumber: data?.display_number ?? null, send };
}
