import { useMemo, useState } from 'react';
import { Faculty, Subject } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, Plus, Trash2, Wallet, Clock, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import {
  PayoutMode,
  useFacultyRatesQuery,
  useUpsertFacultyRateMutation,
  useDeleteFacultyRateMutation,
  useFacultySessionsQuery,
  useAddFacultySessionMutation,
  useDeleteFacultySessionMutation,
  useFacultyPaymentsQuery,
  useRecordFacultyPaymentMutation,
  useDeleteFacultyPaymentMutation,
  usePayoutModeQuery,
  useUpdatePayoutModeMutation,
} from '@/hooks/queries/useFacultySalaryQuery';

const CLASS_OPTIONS = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const DEFAULT_HOURS = 1.5;

const money = (n: number) => `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN')}`;
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Props {
  faculty: Faculty[];
  subjects: Subject[];
  tuitionId: string | null;
  tuitionName?: string;
}

export function FacultySalaryModule({ faculty, subjects, tuitionId, tuitionName }: Props) {
  const [monthCursor, setMonthCursor] = useState(() => iso(monthStart(new Date())).slice(0, 7));
  const cursorDate = useMemo(() => {
    const [y, m] = monthCursor.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1);
  }, [monthCursor]);
  const from = iso(monthStart(cursorDate));
  const to = iso(monthEnd(cursorDate));

  const { data: payoutMode = 'monthly' } = usePayoutModeQuery(tuitionId);
  const updateMode = useUpdatePayoutModeMutation(tuitionId);
  const { data: rates = [] } = useFacultyRatesQuery(tuitionId);
  const { data: sessions = [] } = useFacultySessionsQuery(tuitionId, from, to);
  const { data: payments = [] } = useFacultyPaymentsQuery(tuitionId, from, to);

  const upsertRate = useUpsertFacultyRateMutation(tuitionId);
  const deleteRate = useDeleteFacultyRateMutation(tuitionId);
  const addSession = useAddFacultySessionMutation(tuitionId);
  const deleteSession = useDeleteFacultySessionMutation(tuitionId);
  const recordPayment = useRecordFacultyPaymentMutation(tuitionId);
  const deletePayment = useDeleteFacultyPaymentMutation(tuitionId);

  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [payDialogFor, setPayDialogFor] = useState<{ facultyId: string; suggested: number } | null>(null);

  const facultyName = (id: string) => faculty.find((f) => f.id === id)?.name || 'Teacher';

  const summary = useMemo(() => {
    return faculty
      .map((f) => {
        const fSessions = sessions.filter((s) => s.facultyId === f.id);
        const earned = fSessions.reduce((sum, s) => sum + s.amount, 0);
        const hours = fSessions.reduce((sum, s) => sum + s.hours, 0);
        const paid = payments.filter((p) => p.facultyId === f.id).reduce((sum, p) => sum + p.amount, 0);
        return { faculty: f, earned, hours, paid, pending: Math.max(earned - paid, 0), sessionCount: fSessions.length };
      })
      .sort((a, b) => b.pending - a.pending || a.faculty.name.localeCompare(b.faculty.name));
  }, [faculty, sessions, payments]);

  const totals = useMemo(
    () => ({
      earned: summary.reduce((s, r) => s + r.earned, 0),
      paid: summary.reduce((s, r) => s + r.paid, 0),
      pending: summary.reduce((s, r) => s + r.pending, 0),
      hours: summary.reduce((s, r) => s + r.hours, 0),
    }),
    [summary]
  );

  const printSlip = (payment: (typeof payments)[number]) => {
    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Salary Slip</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}
      h2{margin:0 0 4px}small{color:#666}table{width:100%;margin-top:16px;border-collapse:collapse}
      td{padding:6px 0;border-bottom:1px solid #eee;font-size:14px}td:last-child{text-align:right;font-weight:600}</style>
      </head><body>
      <h2>${tuitionName || 'Tuition Centre'}</h2><small>Salary payment slip</small>
      <table>
        <tr><td>Teacher</td><td>${facultyName(payment.facultyId)}</td></tr>
        <tr><td>Amount</td><td>${money(payment.amount)}</td></tr>
        <tr><td>Date</td><td>${payment.paymentDate}</td></tr>
        <tr><td>Method</td><td>${payment.paymentMethod || '-'}</td></tr>
        <tr><td>Reference</td><td>${payment.paymentReference || '-'}</td></tr>
        <tr><td>For</td><td>${payment.salaryMonth ? payment.salaryMonth.slice(0, 7) : 'Class payment'}</td></tr>
        ${payment.notes ? `<tr><td>Notes</td><td>${payment.notes}</td></tr>` : ''}
      </table>
      <p style="margin-top:32px;font-size:12px;color:#666">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teacher Salaries</h2>
          <p className="text-sm text-muted-foreground">Hourly pay, class hours and payments</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Month</Label>
            <Input type="month" value={monthCursor} onChange={(e) => setMonthCursor(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Pay teachers</Label>
            <Select value={payoutMode} onValueChange={(v) => updateMode.mutate(v as PayoutMode)}>
              <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="per_session">After each class</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setSessionDialogOpen(true)} className="h-9">
            <Plus className="h-4 w-4 mr-1" /> Add class hours
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Clock className="h-4 w-4" />} label="Hours this month" value={`${totals.hours} hr`} />
        <StatCard icon={<IndianRupee className="h-4 w-4" />} label="Earned" value={money(totals.earned)} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Paid" value={money(totals.paid)} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Pending" value={money(totals.pending)} highlight />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Class hours</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="rates">Hourly rates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          {summary.length === 0 && <EmptyCard text="Add teachers in the Classes section first." />}
          {summary.map((row) => (
            <Card key={row.faculty.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{row.faculty.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.sessionCount} class{row.sessionCount === 1 ? '' : 'es'} · {row.hours} hr · earned {money(row.earned)} · paid {money(row.paid)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={row.pending > 0 ? 'destructive' : 'secondary'}>
                    {row.pending > 0 ? `${money(row.pending)} pending` : 'Settled'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPayDialogFor({ facultyId: row.faculty.id, suggested: row.pending })}
                  >
                    Pay
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-2">
          {sessions.length === 0 && <EmptyCard text="No class hours recorded for this month yet." />}
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {facultyName(s.facultyId)} · {s.class}
                    {s.subjectId ? ` · ${subjects.find((sub) => sub.id === s.subjectId)?.name || ''}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.sessionDate} · {s.hours} hr × {money(s.hourlyRate)}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">{money(s.amount)}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteSession.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="space-y-2">
          {payments.length === 0 && <EmptyCard text="No salary payments recorded for this month yet." />}
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{facultyName(p.facultyId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.paymentDate} · {p.paymentMethod || 'cash'}
                    {p.paymentReference ? ` · ${p.paymentReference}` : ''}
                    {p.salaryMonth ? ` · for ${p.salaryMonth.slice(0, 7)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">{money(p.amount)}</span>
                  <Button variant="ghost" size="sm" onClick={() => printSlip(p)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deletePayment.mutate(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rates">
          <RatesTab
            faculty={faculty}
            rates={rates}
            onSave={(facultyId, className, hourlyRate) => upsertRate.mutate({ facultyId, className, hourlyRate })}
            onDelete={(id) => deleteRate.mutate(id)}
          />
        </TabsContent>
      </Tabs>

      <AddSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        faculty={faculty}
        subjects={subjects}
        rates={rates}
        onSubmit={async (values) => {
          await addSession.mutateAsync(values);
          setSessionDialogOpen(false);
        }}
      />

      <PayDialog
        target={payDialogFor}
        facultyName={payDialogFor ? facultyName(payDialogFor.facultyId) : ''}
        payoutMode={payoutMode}
        month={from}
        onClose={() => setPayDialogFor(null)}
        onSubmit={async (values) => {
          await recordPayment.mutateAsync(values);
          setPayDialogFor(null);
        }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {icon}
          <span>{label}</span>
        </div>
        <p className={`mt-1 text-lg font-bold ${highlight ? 'text-destructive' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function RatesTab({
  faculty,
  rates,
  onSave,
  onDelete,
}: {
  faculty: Faculty[];
  rates: { id: string; facultyId: string; class: string; hourlyRate: number }[];
  onSave: (facultyId: string, className: string, hourlyRate: number) => void;
  onDelete: (id: string) => void;
}) {
  const [facultyId, setFacultyId] = useState('');
  const [className, setClassName] = useState('');
  const [rate, setRate] = useState('');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Set an hourly rate</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs">Teacher</Label>
            <Select value={facultyId} onValueChange={setFacultyId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Class</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Rate per hour</Label>
            <Input type="number" inputMode="decimal" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 400" />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                const value = Number(rate);
                if (!facultyId || !className || !(value > 0)) {
                  toast.error('Pick a teacher, a class and a rate');
                  return;
                }
                onSave(facultyId, className, value);
                setRate('');
              }}
            >
              Save rate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rates.length === 0 && <EmptyCard text="No hourly rates set yet." />}
        {rates.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <p className="text-sm">
                <span className="font-medium">{faculty.find((f) => f.id === r.facultyId)?.name || 'Teacher'}</span>
                <span className="text-muted-foreground"> · Class {r.class}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{money(r.hourlyRate)}/hr</span>
                <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddSessionDialog({
  open,
  onOpenChange,
  faculty,
  subjects,
  rates,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  faculty: Faculty[];
  subjects: Subject[];
  rates: { facultyId: string; class: string; hourlyRate: number }[];
  onSubmit: (values: {
    facultyId: string;
    className: string;
    subjectId?: string | null;
    sessionDate: string;
    hours: number;
    hourlyRate: number;
    notes?: string | null;
  }) => Promise<void>;
}) {
  const [facultyId, setFacultyId] = useState('');
  const [className, setClassName] = useState('');
  const [subjectId, setSubjectId] = useState('none');
  const [sessionDate, setSessionDate] = useState(iso(new Date()));
  const [hours, setHours] = useState(String(DEFAULT_HOURS));
  const [rateOverride, setRateOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const defaultRate = rates.find((r) => r.facultyId === facultyId && r.class === className)?.hourlyRate ?? 0;
  const effectiveRate = rateOverride !== '' ? Number(rateOverride) : defaultRate;
  const hoursNum = Number(hours) || 0;
  const classSubjects = subjects.filter((s) => s.class === className);

  const reset = () => {
    setFacultyId('');
    setClassName('');
    setSubjectId('none');
    setHours(String(DEFAULT_HOURS));
    setRateOverride('');
    setNotes('');
    setSessionDate(iso(new Date()));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add class hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Teacher</Label>
            <Select value={facultyId} onValueChange={setFacultyId}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Class</Label>
              <Select value={className} onValueChange={(v) => { setClassName(v); setSubjectId('none'); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subject (optional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {classSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hours</Label>
              <Input type="number" inputMode="decimal" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Rate per hour</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={rateOverride}
              onChange={(e) => setRateOverride(e.target.value)}
              placeholder={defaultRate > 0 ? `${defaultRate} (saved rate)` : 'Enter rate'}
            />
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            Total: <span className="font-semibold">{money(hoursNum * (effectiveRate || 0))}</span>
            {hoursNum > 0 && effectiveRate > 0 && (
              <span className="text-muted-foreground"> ({hoursNum} hr × {money(effectiveRate)})</span>
            )}
          </div>
          <Button
            className="w-full"
            disabled={saving}
            onClick={async () => {
              if (!facultyId || !className) { toast.error('Pick a teacher and a class'); return; }
              if (!(hoursNum > 0)) { toast.error('Enter the hours taken'); return; }
              if (!(effectiveRate > 0)) { toast.error('Set an hourly rate for this teacher and class'); return; }
              setSaving(true);
              try {
                await onSubmit({
                  facultyId,
                  className,
                  subjectId: subjectId === 'none' ? null : subjectId,
                  sessionDate,
                  hours: hoursNum,
                  hourlyRate: effectiveRate,
                  notes: notes || null,
                });
                reset();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({
  target,
  facultyName,
  payoutMode,
  month,
  onClose,
  onSubmit,
}: {
  target: { facultyId: string; suggested: number } | null;
  facultyName: string;
  payoutMode: PayoutMode;
  month: string;
  onClose: () => void;
  onSubmit: (values: {
    facultyId: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    notes?: string | null;
    salaryMonth?: string | null;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(iso(new Date()));
  const [saving, setSaving] = useState(false);

  const open = !!target;
  const suggested = target?.suggested ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setAmount(''); setReference(''); setNotes(''); setMethod('cash'); setDate(iso(new Date()));
        }
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay {facultyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted p-3 text-sm">
            Pending this month: <span className="font-semibold">{money(suggested)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={suggested > 0 ? String(suggested) : '0'}
              />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Reference (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI / cheque no." />
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button
            className="w-full"
            disabled={saving}
            onClick={async () => {
              const value = Number(amount || suggested);
              if (!target || !(value > 0)) { toast.error('Enter an amount'); return; }
              setSaving(true);
              try {
                await onSubmit({
                  facultyId: target.facultyId,
                  amount: value,
                  paymentDate: date,
                  paymentMethod: method,
                  paymentReference: reference || null,
                  notes: notes || null,
                  salaryMonth: payoutMode === 'monthly' ? month : null,
                });
                setAmount(''); setReference(''); setNotes('');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving...' : 'Record payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
