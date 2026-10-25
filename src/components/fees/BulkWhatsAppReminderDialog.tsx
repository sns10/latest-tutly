import { useMemo, useState } from 'react';
import { Student, StudentFee } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUserTuition } from '@/hooks/useUserTuition';
import { useWhatsAppLogs } from '@/hooks/useWhatsAppLogs';
import { DeliveryStatusBadge } from '@/components/whatsapp/DeliveryStatusBadge';
import { useWhatsAppAutomation, formatWhatsAppDate, WhatsAppSendResult } from '@/hooks/useWhatsAppAutomation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFees: StudentFee[];
  studentsById: Map<string, Student>;
  totalPaidByFeeId?: Map<string, number>;
  onDone?: () => void;
}

const hasPhone = (s: Student) =>
  [s.fatherPhone, s.motherPhone, s.parentPhone].some((p) => (p ?? '').replace(/\D/g, '').length >= 10);

export interface ReminderRow { student: Student; remaining: number; dueDate: string; phoneOk: boolean }

/** Groups selected fees into one reminder per student: total remaining + earliest due date; drops ₹0. */
export function buildReminderRows(fees: StudentFee[], studentsById: Map<string, Student>, paid?: Map<string, number>): ReminderRow[] {
  const map = new Map<string, ReminderRow>();
  for (const f of fees) {
    if (f.status === 'paid') continue;
    const s = f.studentId ? studentsById.get(f.studentId) : undefined;
    if (!s) continue;
    const remaining = Math.max(0, f.amount - (paid?.get(f.id) ?? 0));
    if (remaining <= 0) continue;
    const r = map.get(s.id);
    if (r) {
      r.remaining += remaining;
      if (f.dueDate < r.dueDate) r.dueDate = f.dueDate;
    } else map.set(s.id, { student: s, remaining, dueDate: f.dueDate, phoneOk: hasPhone(s) });
  }
  return [...map.values()].sort((a, b) => a.student.name.localeCompare(b.student.name));
}

export function BulkWhatsAppReminderDialog({ open, onOpenChange, selectedFees, studentsById, totalPaidByFeeId, onDone }: Props) {
  const { send } = useWhatsAppAutomation();
  const [result, setResult] = useState<WhatsAppSendResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const { tuitionId } = useUserTuition();
  const { data: logs = [] } = useWhatsAppLogs(tuitionId, !!result && open, sentAt ?? undefined);
  const live = useMemo(() => {
    const m = new Map<string, { status: string; error: string | null }>();
    for (const l of logs) if (l.student_id && !m.has(l.student_id)) m.set(l.student_id, { status: l.delivery_status, error: l.error_message });
    return m;
  }, [logs]);
  const rows = useMemo(() => buildReminderRows(selectedFees, studentsById, totalPaidByFeeId), [selectedFees, studentsById, totalPaidByFeeId]);
  const sendable = rows.filter((r) => r.phoneOk);
  const total = sendable.reduce((s, r) => s + r.remaining, 0);

  const close = (o: boolean) => {
    if (!o) { setResult(null); setErr(null); setSentAt(null); if (result) onDone?.(); }
    onOpenChange(o);
  };

  const handleSend = async () => {
    setErr(null);
    setSentAt(new Date(Date.now() - 60000).toISOString());
    try {
      const r = await send.mutateAsync({
        template: 'fee_reminder_v1',
        messages: sendable.map((x) => ({
          student_id: x.student.id,
          amount: x.remaining.toLocaleString('en-IN'),
          due_date: formatWhatsAppDate(x.dueDate),
        })),
      });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send reminders');
    }
  };

  const nameOf = (id: string) => studentsById.get(id)?.name ?? 'Student';

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Send WhatsApp reminders</DialogTitle>
          <DialogDescription>
            {result ? 'Sending finished.' : `${sendable.length} parent${sendable.length === 1 ? '' : 's'} will get a reminder · ₹${total.toLocaleString('en-IN')} total due`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1 text-primary"><CheckCircle className="h-4 w-4" />{result.sent} sent</span>
              {result.failed > 0 && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-4 w-4" />{result.failed} failed</span>}
            </div>
            {result.results.map((r) => {
              const l = live.get(r.student_id);
              const status = !r.ok ? 'failed' : l?.status ?? 'sent';
              const reason = !r.ok ? r.error : l?.status === 'failed' ? l.error : null;
              return (
                <div key={r.student_id} className="text-xs rounded border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{nameOf(r.student_id)}</span>
                    <DeliveryStatusBadge status={status} />
                  </div>
                  {reason && <p className="text-destructive mt-1">{reason}</p>}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">Statuses update automatically while this is open.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No unpaid amounts in the selection.</p>}
            {rows.map((r) => (
              <div key={r.student.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.student.name}</p>
                  <p className="text-xs text-muted-foreground">Class {r.student.class} · due {formatWhatsAppDate(r.dueDate)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">₹{r.remaining.toLocaleString('en-IN')}</p>
                  {!r.phoneOk && <p className="text-xs text-destructive">No parent phone · skipped</p>}
                </div>
              </div>
            ))}
            {err && <p className="text-sm text-destructive pt-2">{err}</p>}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => close(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)} disabled={send.isPending}>Cancel</Button>
              <Button onClick={handleSend} disabled={send.isPending || sendable.length === 0}>
                {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                {send.isPending ? 'Sending…' : `Send to ${sendable.length}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
