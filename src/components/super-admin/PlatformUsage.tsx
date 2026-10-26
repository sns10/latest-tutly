import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Loader2, Download, ArrowUpDown, Search, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { CenterUsageDialog } from './CenterUsageDialog';

export interface CenterUsage {
  tuition_id: string; name: string; is_active: boolean; subscription_status: string; whatsapp_enabled: boolean;
  students: number; faculty: number; admins: number;
  wa_total: number; wa_delivered: number; wa_read: number; wa_failed: number;
  wa_fee: number; wa_test: number; wa_absence: number; pending_schedules: number;
  attendance_marks: number; tests_created: number; payments_recorded: number; payments_amount: number;
  last_activity: string | null;
}

const DEFAULT_RATE = 0.115;

/** Billable estimate: Meta charges for messages it accepted (failed sends are not billed). */
export const estimateCost = (u: Pick<CenterUsage, 'wa_total' | 'wa_failed'>, rate: number) =>
  Math.max(0, u.wa_total - u.wa_failed) * rate;

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

type SortKey = 'name' | 'wa_total' | 'cost' | 'students' | 'attendance_marks' | 'last_activity';

function monthOptions() {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ value: format(m, 'yyyy-MM'), label: format(m, 'MMMM yyyy') });
  }
  return out;
}

export function PlatformUsage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('wa_total');
  const [selected, setSelected] = useState<CenterUsage | null>(null);
  const months = useMemo(monthOptions, []);

  const usage = useQuery({
    queryKey: ['platformUsage', month],
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_usage', { _month: `${month}-01` });
      if (error) throw error;
      return (data ?? []) as unknown as CenterUsage[];
    },
  });

  const rateQ = useQuery({
    queryKey: ['platformSetting', 'whatsapp_rate_inr'],
    staleTime: 10 * 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('value').eq('key', 'whatsapp_rate_inr').maybeSingle();
      if (error) throw error;
      const n = Number(data?.value);
      return Number.isFinite(n) && n >= 0 ? n : DEFAULT_RATE;
    },
  });
  const rate = rateQ.data ?? DEFAULT_RATE;
  const [rateDraft, setRateDraft] = useState('');
  const saveRate = useMutation({
    mutationFn: async (v: number) => {
      const { error } = await supabase.from('platform_settings').upsert({ key: 'whatsapp_rate_inr', value: v as any, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platformSetting', 'whatsapp_rate_inr'] }); toast.success('Rate saved'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save'),
  });

  const rows = useMemo(() => {
    const list = (usage.data ?? []).filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
    const val = (r: CenterUsage): number | string =>
      sort === 'cost' ? estimateCost(r, rate) : sort === 'last_activity' ? (r.last_activity ?? '') : sort === 'name' ? r.name.toLowerCase() : r[sort];
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      if (sort === 'name') return String(x).localeCompare(String(y));
      return x < y ? 1 : x > y ? -1 : 0;
    });
  }, [usage.data, q, sort, rate]);

  const totals = useMemo(() => {
    const t = { centers: 0, students: 0, sent: 0, delivered: 0, read: 0, failed: 0, cost: 0 };
    for (const r of usage.data ?? []) {
      t.centers++; t.students += r.students; t.sent += r.wa_total; t.delivered += r.wa_delivered;
      t.read += r.wa_read; t.failed += r.wa_failed; t.cost += estimateCost(r, rate);
    }
    return t;
  }, [usage.data, rate]);

  const exportXlsx = () => {
    const data = rows.map((r) => ({
      Center: r.name, Status: r.subscription_status, WhatsApp: r.whatsapp_enabled ? 'On' : 'Off',
      Students: r.students, Faculty: r.faculty, Admins: r.admins,
      'Messages sent': r.wa_total, Delivered: r.wa_delivered, Read: r.wa_read, Failed: r.wa_failed,
      'Fee reminders': r.wa_fee, 'Test results': r.wa_test, 'Absence alerts': r.wa_absence,
      'Est. cost (INR)': Number(estimateCost(r, rate).toFixed(2)), 'Scheduled waiting': r.pending_schedules,
      'Attendance marks': r.attendance_marks, 'Tests created': r.tests_created,
      'Payments recorded': r.payments_recorded, 'Payments amount (INR)': r.payments_amount,
      'Last activity': r.last_activity ? new Date(r.last_activity).toLocaleString('en-IN') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usage');
    XLSX.writeFile(wb, `tutly-usage-${month}.xlsx`);
  };

  const stat = (label: string, v: string | number, hint?: string) => (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{v}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </CardContent></Card>
  );

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Usage & Analytics</h2>
          <p className="text-sm text-muted-foreground">Per-center activity and WhatsApp usage. Cost is an estimate at ₹{rate} per billed message.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Popover onOpenChange={(o) => o && setRateDraft(String(rate))}>
            <PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Cost rate"><Settings2 className="h-4 w-4" /></Button></PopoverTrigger>
            <PopoverContent className="w-64 space-y-2">
              <Label htmlFor="wa-rate">WhatsApp rate per message (₹)</Label>
              <Input id="wa-rate" type="number" step="0.001" min="0" value={rateDraft} onChange={(e) => setRateDraft(e.target.value)} />
              <p className="text-xs text-muted-foreground">Check this against your Meta bill.</p>
              <Button size="sm" className="w-full" disabled={saveRate.isPending} onClick={() => {
                const n = Number(rateDraft);
                if (!Number.isFinite(n) || n < 0 || n > 100) { toast.error('Enter a valid rate'); return; }
                saveRate.mutate(n);
              }}>Save</Button>
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={exportXlsx} disabled={!rows.length}><Download className="h-4 w-4 mr-2" />Excel</Button>
        </div>
      </div>

      {usage.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : usage.error ? (
        <p className="text-sm text-destructive">Could not load usage: {(usage.error as Error).message}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
            {stat('Centers', totals.centers)}
            {stat('Students', totals.students.toLocaleString('en-IN'))}
            {stat('Messages sent', totals.sent.toLocaleString('en-IN'))}
            {stat('Delivered', totals.delivered.toLocaleString('en-IN'), totals.sent ? `${Math.round((totals.delivered / totals.sent) * 100)}% rate` : undefined)}
            {stat('Read', totals.read.toLocaleString('en-IN'))}
            {stat('Est. WhatsApp cost', inr(totals.cost), `${totals.failed} failed (not billed)`)}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search centers" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="sm:w-52"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wa_total">Most messages</SelectItem>
                <SelectItem value="cost">Highest cost</SelectItem>
                <SelectItem value="students">Most students</SelectItem>
                <SelectItem value="attendance_marks">Most attendance marked</SelectItem>
                <SelectItem value="last_activity">Recently active</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 && <p className="text-sm text-muted-foreground">No centers found.</p>}
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const dr = r.wa_total ? Math.round((r.wa_delivered / r.wa_total) * 100) : 0;
              return (
                <Card key={r.tuition_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(r)}>
                  <CardHeader className="p-3 pb-2 flex-row items-start justify-between space-y-0 gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{r.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {r.students} students · {r.faculty} faculty · {r.admins} admin{r.admins === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={r.subscription_status === 'active' ? 'default' : 'secondary'} className="capitalize text-[10px]">{r.subscription_status}</Badge>
                      <Badge variant="outline" className="text-[10px]">WA {r.whatsapp_enabled ? 'on' : 'off'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {[['Sent', r.wa_total], ['Deliv.', r.wa_delivered], ['Read', r.wa_read], ['Failed', r.wa_failed]].map(([l, v]) => (
                        <div key={l as string} className="rounded bg-muted p-1.5">
                          <p className="text-sm font-semibold">{v}</p>
                          <p className="text-[10px] text-muted-foreground">{l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Est. cost <span className="font-semibold">{inr(estimateCost(r, rate))}</span></span>
                      <span className="text-muted-foreground">{r.wa_total ? `${dr}% delivered` : 'No messages'}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {r.attendance_marks} attendance · {r.tests_created} tests · {r.payments_recorded} payments
                      {r.last_activity ? ` · active ${new Date(r.last_activity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ' · no activity'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <CenterUsageDialog usage={selected} month={month} rate={rate} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
}
