import { useEffect, useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Send, CalendarClock, Trash2, Ban } from 'lucide-react';
import { useUserTuition } from '@/hooks/useUserTuition';
import { useStudentsQuery, useFeesQuery, usePaymentsQuery, useWeeklyTestsQuery, useTestResultsQuery } from '@/hooks/queries';
import { useWhatsAppAutomation, formatWhatsAppDate, WhatsAppItem, WhatsAppTemplate, WhatsAppSendResult } from '@/hooks/useWhatsAppAutomation';
import { useWhatsAppLogs } from '@/hooks/useWhatsAppLogs';
import { useWhatsAppSchedules, SCHEDULE_TIME_LABEL } from '@/hooks/useWhatsAppSchedules';
import { buildReminderRows } from '@/components/fees/BulkWhatsAppReminderDialog';
import { DeliveryStatusBadge } from '@/components/whatsapp/DeliveryStatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Student } from '@/types';

const TEMPLATE_LABEL: Record<string, string> = {
  fee_reminder_v1: 'Fee reminder',
  test_result_v1: 'Test result',
  absence_alert_v1: 'Absence alert',
};

const hasPhone = (s: Student) =>
  [s.fatherPhone, s.motherPhone, s.parentPhone].some((p) => (p ?? '').replace(/\D/g, '').length >= 10);

interface Row { student: Student; detail: string; item: WhatsAppItem; phoneOk: boolean }

export default function WhatsAppHubPage() {
  const { tuitionId } = useUserTuition();
  const wa = useWhatsAppAutomation();
  const { data: students = [], isLoading } = useStudentsQuery(tuitionId);
  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  if (isLoading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!wa.enabled) {
    return (
      <div className="w-full px-3 py-8 sm:px-6 text-center">
        <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-lg font-semibold">Automated WhatsApp is off</h1>
        <p className="text-sm text-muted-foreground mt-1">Ask your platform admin to switch on Automated WhatsApp for your center.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5" /> WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Send now or schedule for a date. Scheduled messages go out at {SCHEDULE_TIME_LABEL} on that day.</p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview tuitionId={tuitionId} /></TabsContent>
        <TabsContent value="send"><Composer tuitionId={tuitionId} students={students} studentsById={studentsById} /></TabsContent>
        <TabsContent value="scheduled"><Scheduled tuitionId={tuitionId} studentsById={studentsById} /></TabsContent>
        <TabsContent value="history"><History tuitionId={tuitionId} studentsById={studentsById} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Overview({ tuitionId }: { tuitionId: string | null }) {
  const range = useMemo(() => istMonthRange(format(new Date(), 'yyyy-MM')), []);
  const { data: s, isLoading, error } = useWhatsAppStats(tuitionId, range.from, range.to);
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (error || !s) return <p className="text-sm text-destructive py-4">Could not load numbers.</p>;
  const rate = s.total ? Math.round((s.delivered / s.total) * 100) : 0;
  const stat = (label: string, v: string | number) => (
    <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{v}</p></CardContent></Card>
  );
  return (
    <div className="space-y-3 mt-3">
      <p className="text-xs text-muted-foreground">This month</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stat('Sent', s.total)}{stat('Delivered', s.delivered)}{stat('Read', s.read)}{stat('Failed', s.failed)}{stat('Delivery rate', `${rate}%`)}
      </div>
      <p className="text-sm">{s.pending_schedules} scheduled batch{s.pending_schedules === 1 ? '' : 'es'} waiting.</p>
      {s.failure_reasons.length > 0 && (
        <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Why messages failed</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0 space-y-1">
            {s.failure_reasons.map((r) => <p key={r.reason} className="text-xs"><span className="font-medium">{r.count}×</span> {r.reason}</p>)}
          </CardContent></Card>
      )}
    </div>
  );
}

function Composer({ tuitionId, students, studentsById }: { tuitionId: string | null; students: Student[]; studentsById: Map<string, Student> }) {
  const [template, setTemplate] = useState<WhatsAppTemplate>('fee_reminder_v1');
  const [cls, setCls] = useState('all');
  const [testId, setTestId] = useState('');
  const [mode, setMode] = useState<'now' | 'date'>('now');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const [date, setDate] = useState(tomorrow);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<WhatsAppSendResult | null>(null);

  const { send } = useWhatsAppAutomation();
  const { create } = useWhatsAppSchedules(tuitionId);
  const { data: fees = [] } = useFeesQuery(template === 'fee_reminder_v1' ? tuitionId : null);
  const { data: payments = [] } = usePaymentsQuery(template === 'fee_reminder_v1' ? tuitionId : null);
  const { data: tests = [] } = useWeeklyTestsQuery(template === 'test_result_v1' ? tuitionId : null);
  const { data: results = [] } = useTestResultsQuery(template === 'test_result_v1' && testId ? tuitionId : null, testId || undefined);

  const classes = useMemo(() => [...new Set(students.map((s) => s.class))].sort(), [students]);

  const rows: Row[] = useMemo(() => {
    if (template === 'fee_reminder_v1') {
      const paid = new Map<string, number>();
      for (const p of payments) paid.set(p.feeId, (paid.get(p.feeId) ?? 0) + p.amount);
      const scoped = fees.filter((f) => {
        const s = studentsById.get(f.studentId);
        return s && (cls === 'all' || s.class === cls);
      });
      return buildReminderRows(scoped, studentsById, paid).map((r) => ({
        student: r.student, phoneOk: r.phoneOk,
        detail: `₹${r.remaining.toLocaleString('en-IN')} · due ${formatWhatsAppDate(r.dueDate)}`,
        item: { student_id: r.student.id, amount: r.remaining.toLocaleString('en-IN'), due_date: formatWhatsAppDate(r.dueDate) },
      }));
    }
    const test = tests.find((t) => t.id === testId);
    if (!test) return [];
    return results
      .filter((r) => r.testId === test.id && !r.isAbsent)
      .map((r) => studentsById.get(r.studentId) && ({ s: studentsById.get(r.studentId)!, r }))
      .filter(Boolean)
      .map(({ s, r }: any) => ({
        student: s, phoneOk: hasPhone(s), detail: `${r.marks}/${test.maxMarks}`,
        item: { student_id: s.id, subject: test.subject, date: formatWhatsAppDate(test.date), marks: String(r.marks), total: String(test.maxMarks) },
      }))
      .sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [template, fees, payments, cls, studentsById, tests, testId, results]);

  useEffect(() => {
    setPicked(new Set(rows.filter((r) => r.phoneOk).map((r) => r.student.id)));
    setResult(null);
  }, [rows]);

  const chosen = rows.filter((r) => r.phoneOk && picked.has(r.student.id));
  const busy = send.isPending || create.isPending;

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const submit = async () => {
    if (!chosen.length) return;
    const messages = chosen.map((r) => r.item);
    try {
      if (mode === 'now') {
        const r = await send.mutateAsync({ template, messages });
        setResult(r);
        toast.success(`Sent ${r.sent}, failed ${r.failed}`);
      } else {
        if (date < tomorrow) { toast.error('Pick a date from tomorrow onwards'); return; }
        const defaultTitle = template === 'fee_reminder_v1'
          ? `Fee reminders${cls !== 'all' ? ` · Class ${cls}` : ''}`
          : `Results · ${tests.find((t) => t.id === testId)?.name ?? ''}`;
        await create.mutateAsync({ template, title: title.trim() || defaultTitle, scheduled_date: date, messages });
        toast.success(`Scheduled ${messages.length} messages for ${formatWhatsAppDate(date)} at ${SCHEDULE_TIME_LABEL}`);
        setTitle('');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not complete');
    }
  };

  return (
    <div className="space-y-4 mt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Message</Label>
          <Select value={template} onValueChange={(v) => setTemplate(v as WhatsAppTemplate)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fee_reminder_v1">Fee reminder (unpaid fees)</SelectItem>
              <SelectItem value="test_result_v1">Test result</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {template === 'fee_reminder_v1' ? (
          <div className="space-y-1">
            <Label>Class</Label>
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1">
            <Label>Test</Label>
            <Select value={testId} onValueChange={setTestId}>
              <SelectTrigger><SelectValue placeholder="Choose a test" /></SelectTrigger>
              <SelectContent>
                {tests.slice(0, 100).map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.subject} · Class {t.class} · {formatWhatsAppDate(t.date)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="p-3 pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">{chosen.length} of {rows.length} parents selected</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set(rows.filter((r) => r.phoneOk).map((r) => r.student.id)))}>All</Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>None</Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 max-h-80 overflow-y-auto space-y-1">
          {rows.length === 0 && <p className="text-sm text-muted-foreground py-3">{template === 'test_result_v1' && !testId ? 'Choose a test.' : 'No students to message.'}</p>}
          {rows.map((r) => {
            const res = result?.results.find((x) => x.student_id === r.student.id);
            return (
              <label key={r.student.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                <Checkbox disabled={!r.phoneOk} checked={r.phoneOk && picked.has(r.student.id)} onCheckedChange={() => toggle(r.student.id)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.student.name} <span className="text-xs text-muted-foreground">· Class {r.student.class}</span></p>
                  <p className="text-xs text-muted-foreground">{r.detail}</p>
                </div>
                {!r.phoneOk && <Badge variant="outline" className="text-xs">No phone</Badge>}
                {res && <Badge variant={res.ok ? 'default' : 'destructive'} className="text-xs">{res.ok ? 'Sent' : res.error}</Badge>}
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 space-y-3">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'now' | 'date')} className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="now" /> Send now</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="date" /> Schedule for a date</label>
          </RadioGroup>
          {mode === 'date' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">Sends at {SCHEDULE_TIME_LABEL} on this day. Amounts and marks are saved as they are now.</p>
              </div>
              <div className="space-y-1">
                <Label>Name (optional)</Label>
                <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. November fee reminders" />
              </div>
            </div>
          )}
          <Button className="w-full sm:w-auto" disabled={!chosen.length || busy} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : mode === 'now' ? <Send className="h-4 w-4 mr-2" /> : <CalendarClock className="h-4 w-4 mr-2" />}
            {mode === 'now' ? `Send to ${chosen.length} parents` : `Schedule ${chosen.length} messages`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const STATUS_STYLE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary', processing: 'secondary', completed: 'default', cancelled: 'outline', failed: 'destructive',
};

function Scheduled({ tuitionId, studentsById }: { tuitionId: string | null; studentsById: Map<string, Student> }) {
  const { list, cancel, remove } = useWhatsAppSchedules(tuitionId);
  const [open, setOpen] = useState<string | null>(null);
  if (list.isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const rows = list.data ?? [];
  if (!rows.length) return <p className="text-sm text-muted-foreground py-6">Nothing scheduled. Use the Send tab and pick “Schedule for a date”.</p>;
  return (
    <div className="space-y-2 mt-3">
      {rows.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button className="min-w-0 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
                <p className="font-medium text-sm truncate">{s.title || TEMPLATE_LABEL[s.template]}</p>
                <p className="text-xs text-muted-foreground">
                  {TEMPLATE_LABEL[s.template]} · {s.recipient_count} parents · {formatWhatsAppDate(s.scheduled_date)} at {SCHEDULE_TIME_LABEL}
                </p>
                {s.status === 'completed' && <p className="text-xs">Sent {s.sent_count}, failed {s.failed_count}</p>}
                {s.error_message && <p className="text-xs text-destructive">{s.error_message}</p>}
              </button>
              <Badge variant={STATUS_STYLE[s.status]} className="capitalize shrink-0">{s.status}</Badge>
            </div>
            <div className="flex gap-2">
              {s.status === 'pending' && (
                <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(s.id, { onSuccess: () => toast.success('Cancelled') })}>
                  <Ban className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              )}
              {s.status !== 'processing' && (
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(s.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>
            {open === s.id && (
              <div className="border-t pt-2 space-y-0.5 max-h-48 overflow-y-auto">
                {(s.messages ?? []).map((m) => (
                  <p key={m.student_id} className="text-xs">{studentsById.get(m.student_id)?.name ?? 'Student'}{m.amount ? ` · ₹${m.amount}` : ''}{m.marks ? ` · ${m.marks}/${m.total}` : ''}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function History({ tuitionId, studentsById }: { tuitionId: string | null; studentsById: Map<string, Student> }) {
  const [filter, setFilter] = useState('all');
  const { data = [], isLoading } = useWhatsAppLogs(tuitionId, true);
  const rows = filter === 'all' ? data : data.filter((r) => r.delivery_status === filter);
  return (
    <div className="space-y-2 mt-3">
      <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v)} className="justify-start flex-wrap">
        {['all', 'sent', 'delivered', 'read', 'failed'].map((f) => (
          <ToggleGroupItem key={f} value={f} className="text-xs h-8 px-3 capitalize">{f}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
      {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground py-4">No messages yet.</p>}
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
  );
}
