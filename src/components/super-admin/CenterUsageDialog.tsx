import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppStats, istMonthRange } from '@/hooks/useWhatsAppLogs';
import { CenterUsage, estimateCost } from './PlatformUsage';

const TEMPLATE_LABEL: Record<string, string> = {
  fee_reminder_v1: 'Fee reminders', test_result_v1: 'Test results', absence_alert_v1: 'Absence alerts',
};

interface Props { usage: CenterUsage | null; month: string; rate: number; onOpenChange: (o: boolean) => void }

export function CenterUsageDialog({ usage, month, rate, onOpenChange }: Props) {
  const range = istMonthRange(month);
  const { data: s, isLoading } = useWhatsAppStats(usage?.tuition_id, range.from, range.to);
  const schedules = useQuery({
    queryKey: ['centerSchedules', usage?.tuition_id],
    enabled: !!usage,
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_scheduled_dispatches')
        .select('id, title, template, scheduled_date, recipient_count, status, sent_count, failed_count')
        .eq('tuition_id', usage!.tuition_id).order('scheduled_date', { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Dialog open={!!usage} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{usage?.name}</DialogTitle>
          <DialogDescription>
            {usage && <>Estimated WhatsApp cost ₹{estimateCost(usage, rate).toFixed(2)} · {usage.payments_recorded} payments worth ₹{Number(usage.payments_amount).toLocaleString('en-IN')}</>}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !s ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Messages per day</p>
              {s.by_day.length === 0 ? <p className="text-xs text-muted-foreground">No messages this month.</p> : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.by_day.map((d) => ({ ...d, label: d.day.slice(8) }))}>
                      <XAxis dataKey="label" fontSize={10} />
                      <YAxis fontSize={10} allowDecimals={false} width={28} />
                      <Tooltip />
                      <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(s.by_template).map(([k, v]) => <Badge key={k} variant="secondary">{TEMPLATE_LABEL[k] ?? k}: {v}</Badge>)}
            </div>
            {s.failure_reasons.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Top failure reasons</p>
                {s.failure_reasons.map((r) => <p key={r.reason} className="text-xs"><span className="font-semibold">{r.count}×</span> {r.reason}</p>)}
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1">Scheduled batches</p>
              {(schedules.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
              {(schedules.data ?? []).map((b: any) => (
                <div key={b.id} className="flex justify-between text-xs border-b py-1 gap-2">
                  <span className="truncate">{b.title || TEMPLATE_LABEL[b.template]} · {b.recipient_count} · {b.scheduled_date}</span>
                  <span className="capitalize shrink-0">{b.status}{b.status === 'completed' ? ` (${b.sent_count}/${b.failed_count})` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
