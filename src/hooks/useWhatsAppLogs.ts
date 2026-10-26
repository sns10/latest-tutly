import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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

const COLUMNS = 'id, student_id, template_name, recipient, status, delivery_status, message_id, error_message, error_code, created_at, delivered_at, read_at, failed_at';

/** Recent WhatsApp sends for a center, refreshed every 15s while visible. */
export function useWhatsAppLogs(tuitionId: string | null | undefined, enabled = true, since?: string) {
  return useQuery({
    queryKey: ['whatsappLogs', tuitionId, since ?? null],
    enabled: !!tuitionId && enabled,
    refetchInterval: enabled ? 15000 : false,
    refetchIntervalInBackground: false,
    staleTime: 5000,
    queryFn: async () => {
      let q = supabase.from('whatsapp_logs').select(COLUMNS)
        .eq('tuition_id', tuitionId!).order('created_at', { ascending: false }).limit(200);
      if (since) q = q.gte('created_at', since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WhatsAppLog[];
    },
  });
}

const PAGE = 50;

/** Paged history (50 per page) with optional delivery-status filter. */
export function useWhatsAppLogsPaged(tuitionId: string | null | undefined, status: string) {
  return useInfiniteQuery({
    queryKey: ['whatsappLogsPaged', tuitionId, status],
    enabled: !!tuitionId,
    initialPageParam: 0,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    queryFn: async ({ pageParam }) => {
      let q = supabase.from('whatsapp_logs').select(COLUMNS)
        .eq('tuition_id', tuitionId!).order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (status !== 'all') q = q.eq('delivery_status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WhatsAppLog[];
    },
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
  });
}

export interface WhatsAppStats {
  total: number; delivered: number; read: number; failed: number;
  by_template: Record<string, number>;
  by_day: { day: string; sent: number; failed: number }[];
  failure_reasons: { reason: string; count: number }[];
  pending_schedules: number;
}

/** Exact counts computed in the database (no row cap). */
export function useWhatsAppStats(tuitionId: string | null | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['whatsappStats', tuitionId, from, to],
    enabled: !!tuitionId,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_whatsapp_stats', { _tuition_id: tuitionId!, _from: from, _to: to });
      if (error) throw error;
      return data as unknown as WhatsAppStats;
    },
  });
}

/** IST month boundaries as ISO strings for a "YYYY-MM" value. */
export function istMonthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ny = m === 12 ? y + 1 : y; const nm = m === 12 ? 1 : m + 1;
  return { from: `${y}-${pad(m)}-01T00:00:00+05:30`, to: `${ny}-${pad(nm)}-01T00:00:00+05:30` };
}
