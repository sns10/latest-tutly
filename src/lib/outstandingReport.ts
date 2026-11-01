import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface OutstandingRow {
  student_id: string;
  name: string;
  roll_no: number | null;
  class: string;
  division_id: string | null;
  phone: string | null;
  missed_months: string[];
  missed_count: number;
  paid_total: number;
  outstanding: number;
  late_fee: number;
  last_payment_date: string | null;
}

export type Risk = 'High' | 'Medium' | 'Low';

export function riskFor(missed: number): Risk {
  if (missed >= 3) return 'High';
  if (missed === 2) return 'Medium';
  return 'Low';
}

/** Period: first day of academic-year start month up to last day of `upTo` (YYYY-MM). */
export function reportPeriod(upTo: string, startMonth: number): { from: string; to: string } {
  const [y, m] = upTo.split('-').map(Number);
  const startYear = m >= startMonth ? y : y - 1;
  const from = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabels(months: string[]): string {
  return [...months].sort().map(v => {
    const [y, m] = v.split('-').map(Number);
    return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
  }).join(', ');
}

export const totalDue = (r: OutstandingRow) => Number(r.outstanding) + Number(r.late_fee);

export function summarize(rows: OutstandingRow[]) {
  return rows.reduce((s, r) => ({
    students: s.students + 1,
    outstanding: s.outstanding + Number(r.outstanding),
    late: s.late + Number(r.late_fee),
    total: s.total + totalDue(r),
    high: s.high + (riskFor(r.missed_count) === 'High' ? 1 : 0),
  }), { students: 0, outstanding: 0, late: 0, total: 0, high: 0 });
}

const inr = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

export function tableRows(rows: OutstandingRow[], divName: (id: string | null) => string) {
  return rows.map(r => [
    r.roll_no ?? '-', r.name, `${r.class}${divName(r.division_id) ? ' ' + divName(r.division_id) : ''}`,
    r.phone || '-', `${r.missed_count} - ${monthLabels(r.missed_months)}`, Number(r.paid_total),
    Number(r.outstanding), Number(r.late_fee), totalDue(r), r.last_payment_date || 'Never', riskFor(r.missed_count),
  ]);
}

export const HEADERS = ['Roll', 'Name', 'Class', 'Phone', 'Months missed', 'Paid', 'Outstanding', 'Late fee', 'Total due', 'Last payment', 'Risk'];

export function createOutstandingPdf(rows: OutstandingRow[], centerName: string, subtitle: string, divName: (id: string | null) => string): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const s = summarize(rows);
  doc.setFontSize(14); doc.text(centerName || 'Fee Report', 14, 14);
  doc.setFontSize(10); doc.text(`Outstanding fee report - ${subtitle}`, 14, 20);
  doc.text(`Students with dues: ${s.students}   Outstanding: ${inr(s.outstanding)}   Late fee: ${inr(s.late)}   Total due: ${inr(s.total)}   High risk: ${s.high}`, 14, 26);
  autoTable(doc, {
    startY: 30,
    head: [HEADERS],
    body: tableRows(rows, divName).map(r => r.map((v, i) => (i >= 5 && i <= 8 ? inr(Number(v)) : String(v)))),
    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: { 4: { cellWidth: 55 } },
  });
  return doc.output('blob');
}
