import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { Student, StudentFee } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, Upload, Loader2 } from 'lucide-react';
import { chunk, validateBulkPayments } from '@/lib/bulkFees';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tuitionId: string | null;
  fees: StudentFee[];
  studentsById: Map<string, Student>;
  totalPaidByFeeId: Map<string, number>;
  classes: string[];
}

interface Row { fee: StudentFee; student?: Student; remaining: number }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function BulkPaymentEntryDialog({ open, onOpenChange, tuitionId, fees, studentsById, totalPaidByFeeId, classes }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cls, setCls] = useState<string>('All');
  const [month, setMonth] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) { setAmounts({}); setSearch(''); } }, [open]);

  const monthOptions = useMemo(() => {
    const out: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      });
    }
    return out;
  }, []);

  // Only computed while open, from data already loaded on the Fees page — no extra fetch.
  const rows = useMemo<Row[]>(() => {
    if (!open) return [];
    const q = search.trim().toLowerCase();
    let monthStart = '', monthEnd = '';
    if (month !== 'All') {
      const [y, m] = month.split('-').map(Number);
      monthStart = `${month}-01`;
      monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    }
    const out: Row[] = [];
    for (const fee of fees) {
      if (fee.status === 'paid') continue;
      if (month !== 'All') {
        // Same rule as the Fees list: month in fee label, or due date within the month.
        const inMonth = (fee.feeType && fee.feeType.includes(month)) ||
          (fee.dueDate >= monthStart && fee.dueDate <= monthEnd);
        if (!inMonth) continue;
      }
      const student = studentsById.get(fee.studentId);
      if (cls !== 'All' && student?.class !== cls) continue;
      if (q && !(student?.name || '').toLowerCase().includes(q)) continue;
      const remaining = Math.max(0, Number(fee.amount) - (totalPaidByFeeId.get(fee.id) || 0));
      if (remaining <= 0) continue;
      out.push({ fee, student, remaining });
    }
    return out.sort((a, b) =>
      (a.student?.name || '').localeCompare(b.student?.name || '') || a.fee.dueDate.localeCompare(b.fee.dueDate));
  }, [open, fees, studentsById, totalPaidByFeeId, cls, month, search]);

  const entered = rows.map(r => ({ feeId: r.fee.id, remaining: r.remaining, amount: Number(amounts[r.fee.id] || 0) }));
  const { valid, invalid } = validateBulkPayments(entered);
  const total = valid.reduce((s, v) => s + v.amount, 0);
  const allFull = rows.length > 0 && rows.every(r => Number(amounts[r.fee.id]) === r.remaining);

  const toggleFull = (r: Row, on: boolean) =>
    setAmounts(a => ({ ...a, [r.fee.id]: on ? String(r.remaining) : '' }));
  const toggleAll = (on: boolean) =>
    setAmounts(a => { const n = { ...a }; rows.forEach(r => { n[r.fee.id] = on ? String(r.remaining) : ''; }); return n; });

  const downloadTemplate = () => {
    const data = rows.map(r => ({
      'Fee ID': r.fee.id,
      Student: r.student?.name || '',
      Class: r.student?.class || '',
      'Roll No': r.student?.rollNo ?? '',
      'Fee Type': r.fee.feeType || '',
      'Due Date': r.fee.dueDate,
      'Remaining Due': r.remaining,
      'Amount Paid': '',
    }));
    if (data.length === 0) { toast.info('No unpaid fees for this selection'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ hidden: true }, { wch: 24 }, { wch: 8 }, { wch: 8 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `fee-payments-${cls === 'All' ? 'all' : `class-${cls}`}${month === 'All' ? '' : `-${month}`}.xlsx`);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const known = new Set(fees.map(f => f.id));
      const next: Record<string, string> = {};
      let matched = 0, unknown = 0;
      for (const row of json) {
        const id = String(row['Fee ID'] || '').trim();
        const amt = Number(row['Amount Paid']);
        if (!id || !Number.isFinite(amt) || amt <= 0) continue;
        if (!known.has(id)) { unknown++; continue; }
        next[id] = String(amt); matched++;
      }
      setCls('All'); setMonth('All'); setSearch('');
      setAmounts(next);
      toast.success(`Loaded ${matched} payments from file${unknown ? ` (${unknown} rows not recognised)` : ''}. Review and tap Save.`);
    } catch {
      toast.error('Could not read that file. Use the downloaded template.');
    }
  };

  const save = async () => {
    if (valid.length === 0) return;
    setSaving(true);
    let recorded = 0;
    const failed: string[] = [];
    try {
      for (const part of chunk(valid, 200)) {
        const { data, error } = await supabase.rpc('bulk_record_fee_payments' as any, {
          _records: part.map(p => ({ fee_id: p.feeId, amount: p.amount, payment_method: method, payment_date: date })),
        });
        if (error) throw error;
        const res = data as { recorded: number; failed: Array<{ error: string }> };
        recorded += res.recorded;
        res.failed.forEach(f => failed.push(f.error));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save payments');
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['fees', tuitionId] }),
        qc.invalidateQueries({ queryKey: ['feePayments', tuitionId] }),
        qc.invalidateQueries({ queryKey: ['todayPayments', tuitionId] }),
      ]);
      setSaving(false);
    }
    if (recorded > 0) toast.success(`Recorded ${recorded} payment${recorded > 1 ? 's' : ''}`);
    if (failed.length) toast.error(`${failed.length} not saved: ${failed[0]}`);
    if (recorded > 0 && failed.length === 0) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bulk payment entry</DialogTitle>
          <DialogDescription>Tick to pay in full, or type a part amount. Or fill the Excel sheet and upload it.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All classes</SelectItem>
              {classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All months</SelectItem>
              {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="col-span-2" placeholder="Search student" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" />Excel template</Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Upload filled sheet</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onUpload} />
        </div>

        <div className="border rounded-md">
          <label className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50 text-sm font-medium">
            <Checkbox checked={allFull} onCheckedChange={(c) => toggleAll(!!c)} disabled={rows.length === 0} />
            Pay all in full ({rows.length} unpaid fees)
          </label>
          <div className="max-h-[45vh] overflow-y-auto divide-y">
            {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No unpaid fees for this selection.</p>}
            {rows.map(r => {
              const v = amounts[r.fee.id] || '';
              const bad = Number(v) > r.remaining;
              return (
                <div key={r.fee.id} className="flex items-center gap-2 px-3 py-2">
                  <Checkbox checked={Number(v) === r.remaining} onCheckedChange={(c) => toggleFull(r, !!c)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.student?.name || 'Unknown'} <span className="text-muted-foreground font-normal">· {r.student?.class}</span></p>
                    <p className="text-xs text-muted-foreground truncate">{r.fee.feeType} · due {fmt(r.remaining)}</p>
                  </div>
                  <Input
                    inputMode="decimal" type="number" min={0} value={v} placeholder="0"
                    className={`w-24 h-9 ${bad ? 'border-destructive' : ''}`}
                    onChange={e => setAmounts(a => ({ ...a, [r.fee.id]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {invalid.length > 0 && <p className="text-xs text-destructive">{invalid.length} amount(s) are more than the remaining due and will not be saved.</p>}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || valid.length === 0 || invalid.length > 0}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save {valid.length} payment{valid.length === 1 ? '' : 's'} · {fmt(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
