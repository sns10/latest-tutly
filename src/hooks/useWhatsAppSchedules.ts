import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppItem, WhatsAppTemplate } from './useWhatsAppAutomation';

export interface WhatsAppSchedule {
  id: string;
  template: WhatsAppTemplate;
  title: string;
  scheduled_date: string;
  recipient_count: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: string;
  dispatched_at: string | null;
  messages: WhatsAppItem[];
}

/** Fixed daily send time for every scheduled batch. */
export const SCHEDULE_TIME_LABEL = '9:00 AM';

export function useWhatsAppSchedules(tuitionId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['whatsappSchedules', tuitionId];

  const list = useQuery({
    queryKey: key,
    enabled: !!tuitionId,
    staleTime: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_scheduled_dispatches')
        .select('*')
        .eq('tuition_id', tuitionId!)
        .order('scheduled_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppSchedule[];
    },
  });

  const create = useMutation({
    mutationFn: async (v: { template: WhatsAppTemplate; title: string; scheduled_date: string; messages: WhatsAppItem[] }) => {
      const { error } = await supabase.from('whatsapp_scheduled_dispatches').insert({
        tuition_id: tuitionId!, template: v.template, title: v.title,
        scheduled_date: v.scheduled_date, messages: v.messages as any,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_scheduled_dispatches')
        .update({ status: 'cancelled' }).eq('id', id).eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_scheduled_dispatches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { list, create, cancel, remove };
}
