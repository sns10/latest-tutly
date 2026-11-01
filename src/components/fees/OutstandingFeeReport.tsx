import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, FileText, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from '@/hooks/useUserTuition';
import { useDivisionsQuery } from '@/hooks/queries/useCoreDataQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Student } from '@/types';
import {
  OutstandingRow, HEADERS, createOutstandingPdf, monthLabels, reportPeriod, riskFor, summarize, tableRows, totalDue,
} from '@/lib/outstandingReport';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const START_KEY = 'tutly.academicStartMonth';
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function OutstandingFeeReport({ students }: { students: Student[] }) {
  const { tuitionId } = useUserTuition();
  const { data: divisions = [] } = useDivisionsQuery(tuitionId);
  const classes = useMemo(() => Array.from(new Set(students.map(s => s.class))).sort(), [students]);
  const now = new Date();
  const [cls, setCls] = useState('all');
  const [div, setDiv] = useState('all');
  const [upTo, setUpTo] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [startMonth, setStartMonth] = useState<number>(() => Number(localStorage.getItem(START_KEY)) || 6);
  const [params, setParams] = useState<null | { cls: string; div: string; from: string; to: string }>(null);

  const months = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch only when the admin taps Generate (params set) — never on screen open.
  const q = useQuery({
    queryKey: ['outstandingReport', tuitionId, params],
    enabled: !!tuitionId && !!params,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_class_outstanding_report', {
        _tuition_id: tuitionId!, _class: params!.cls === 'all' ? null : params!.cls,
        _division_id: params!.div === 'all' ? null : params!.div, _from: params!.from, _to: params!.to,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as OutstandingRow[];
    },
  });

  const { data: tuition } = useQuery({
    queryKey: ['tuitionName', tuitionId], enabled: !!tuitionId && !!params, staleTime: 30 * 60 * 1000,
    queryFn: async () => (await supabase.from('tuitions').select('name').eq('id', tuitionId!).maybeSingle()).data,
  });

  const divName = (id: string | null) => divisions.find(d => d.id === id)?.name ?? '';
  const rows = q.data ?? [];
  const sum = summarize(rows);
  const classDivs = divisions.filter(d => cls !== 'all' && d.class === cls);

  const generate = () => {
    localStorage.setItem(START_KEY, String(startMonth));
    const p = reportPeriod(upTo, startMonth);
    setParams({ cls, div: cls === 'all' ? 'all' : div, ...p });
  };

  const subtitle = params
    ? `${params.cls === 'all' ? 'All classes' : params.cls}${params.div !== 'all' ? ' ' + divName(params.div) : ''}, ${params.from} to ${params.to}`
    : '';
  const fileBase = `outstanding-${params?.cls ?? 'all'}-${upTo}`;

  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...tableRows(rows, divName)]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Outstanding');
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
  };
  const exportPdf = () => {
    try { download(createOutstandingPdf(rows, tuition?.name ?? '', subtitle, divName), `${fileBase}.pdf`); }
    catch { toast.error('Could not create PDF'); }
  };

  const riskVariant = (n: number) => (riskFor(n) === 'High' ? 'destructive' : riskFor(n) === 'Medium' ? 'default' : 'secondary');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding by Class</CardTitle>
        <CardDescription>Unpaid fees from the start of the academic year up to the chosen month, highest dues first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Select value={cls} onValueChange={v => { setCls(v); setDiv('all'); }}>
            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={div} onValueChange={setDiv} disabled={cls === 'all' || classDivs.length === 0}>
            <SelectTrigger><SelectValue placeholder="Division" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All divisions</SelectItem>
              {classDivs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={upTo} onValueChange={setUpTo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>Up to {m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(startMonth)} onValueChange={v => setStartMonth(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MONTH_NAMES.map((n, i) => <SelectItem key={n} value={String(i + 1)}>Year starts {n}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={generate} disabled={!tuitionId || q.isFetching} className="col-span-2 md:col-span-1">
            {q.isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Generate report
          </Button>
        </div>

        {!params && <p className="text-sm text-muted-foreground text-center py-6">Choose a class and month, then tap Generate report.</p>}
        {q.isError && <p className="text-sm text-destructive">Could not load the report. Please try again.</p>}

        {params && q.isSuccess && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[['Students with dues', String(sum.students)], ['Outstanding', inr(sum.outstanding)], ['Late fee', inr(sum.late)],
                ['Total due', inr(sum.total)], ['High risk (3+ months)', String(sum.high)]].map(([l, v]) => (
                <div key={l} className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-lg font-bold">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{subtitle}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportPdf} disabled={!rows.length}><FileText className="h-4 w-4 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={exportExcel} disabled={!rows.length}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending fees in this period.</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {rows.map(r => (
                        <TableRow key={r.student_id}>
                          <TableCell>{r.roll_no ?? '-'}</TableCell>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>{r.class} {divName(r.division_id)}</TableCell>
                          <TableCell>{r.phone || '-'}</TableCell>
                          <TableCell className="max-w-[200px]"><b>{r.missed_count}</b> <span className="text-xs text-muted-foreground">{monthLabels(r.missed_months)}</span></TableCell>
                          <TableCell>{inr(Number(r.paid_total))}</TableCell>
                          <TableCell>{inr(Number(r.outstanding))}</TableCell>
                          <TableCell>{inr(Number(r.late_fee))}</TableCell>
                          <TableCell className="font-semibold">{inr(totalDue(r))}</TableCell>
                          <TableCell>{r.last_payment_date || 'Never'}</TableCell>
                          <TableCell><Badge variant={riskVariant(r.missed_count)}>{riskFor(r.missed_count)}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-2">
                  {rows.map(r => (
                    <div key={r.student_id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex justify-between gap-2">
                        <p className="font-medium text-sm">{r.name} <span className="text-xs text-muted-foreground">{r.class} {divName(r.division_id)}</span></p>
                        <Badge variant={riskVariant(r.missed_count)}>{riskFor(r.missed_count)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.missed_count} months missed: {monthLabels(r.missed_months)}</p>
                      <div className="grid grid-cols-2 text-xs gap-1">
                        <span>Outstanding: {inr(Number(r.outstanding))}</span>
                        <span>Late fee: {inr(Number(r.late_fee))}</span>
                        <span className="font-semibold">Total due: {inr(totalDue(r))}</span>
                        <span>Paid: {inr(Number(r.paid_total))}</span>
                        <span>Last paid: {r.last_payment_date || 'Never'}</span>
                        <span>{r.phone || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
