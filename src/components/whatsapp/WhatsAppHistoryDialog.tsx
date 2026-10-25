import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2 } from 'lucide-react';
import { useWhatsAppLogs } from '@/hooks/useWhatsAppLogs';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { Student } from '@/types';

const TEMPLATE_LABEL: Record<string, string> = {
  fee_reminder_v1: 'Fee reminder',
  test_result_v1: 'Test result',
  absence_alert_v1: 'Absence alert',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tuitionId: string | null | undefined;
  studentsById: Map<string, Student>;
}

export function WhatsAppHistoryDialog({ open, onOpenChange, tuitionId, studentsById }: Props) {
  const [filter, setFilter] = useState('all');
  const { data = [], isLoading, error } = useWhatsAppLogs(tuitionId, open);
  const rows = filter === 'all' ? data : data.filter((r) => r.delivery_status === filter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>WhatsApp history</DialogTitle>
          <DialogDescription>Updates automatically as Meta reports delivery.</DialogDescription>
        </DialogHeader>
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v)} className="justify-start flex-wrap">
          {['all', 'sent', 'delivered', 'read', 'failed'].map((f) => (
            <ToggleGroupItem key={f} value={f} className="text-xs h-8 px-3 capitalize">{f}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {error && <p className="text-sm text-destructive">Could not load history.</p>}
        {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground py-4">No messages yet.</p>}
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded border p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{(r.student_id && studentsById.get(r.student_id)?.name) || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">
                    {TEMPLATE_LABEL[r.template_name] ?? r.template_name} · ••{r.recipient.slice(-4)} · {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <DeliveryStatusBadge status={r.delivery_status} />
              </div>
              {r.delivery_status === 'failed' && r.error_message && (
                <p className="text-xs text-destructive mt-1">{r.error_message}{r.error_code ? ` (code ${r.error_code})` : ''}</p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
