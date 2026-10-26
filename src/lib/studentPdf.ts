import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Student } from '@/types';

export const STUDENT_PDF_COLUMNS = [
  { id: 'rollNo', label: 'Roll No', width: 20 },
  { id: 'name', label: 'Name', width: 48 },
  { id: 'class', label: 'Class', width: 20 },
  { id: 'division', label: 'Division', width: 24 },
  { id: 'dateOfBirth', label: 'Date of Birth', width: 30 },
  { id: 'gender', label: 'Gender', width: 24 },
  { id: 'phone', label: 'Student Phone', width: 34 },
  { id: 'email', label: 'Email', width: 50 },
  { id: 'parentName', label: 'Parent Name', width: 44 },
  { id: 'parentPhone', label: 'Parent Phone', width: 34 },
  { id: 'fatherPhone', label: 'Father Phone', width: 34 },
  { id: 'motherPhone', label: 'Mother Phone', width: 34 },
  { id: 'address', label: 'Address', width: 58 },
  { id: 'schoolName', label: 'School Name', width: 48 },
] as const;

export type StudentPdfColumn = typeof STUDENT_PDF_COLUMNS[number]['id'];
export const DEFAULT_STUDENT_PDF_COLUMNS: StudentPdfColumn[] = ['rollNo', 'name', 'class', 'division', 'fatherPhone'];

export function studentPdfValue(student: Student, column: StudentPdfColumn): string {
  if (column === 'division') return student.division?.name || '-';
  const value = student[column];
  if (value === undefined || value === null || value === '') return '-';
  if (column === 'gender') return String(value).replace(/^./, c => c.toUpperCase());
  return String(value);
}

export function createStudentPdf(students: Student[], selected: StudentPdfColumn[], centerName: string, scope: string) {
  const columns = STUDENT_PDF_COLUMNS.filter(column => selected.includes(column.id));
  if (!students.length || !columns.length) throw new Error('Choose at least one column and one student.');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `${centerName} - Student Details`, author: centerName });
  const availableWidth = doc.internal.pageSize.getWidth() - 24;
  const wide = columns.reduce((total, column) => total + column.width, 0) > availableWidth;
  autoTable(doc, {
    columns: columns.map(column => ({ header: column.label, dataKey: column.id })),
    body: students.map(student => Object.fromEntries(columns.map(column => [column.id, studentPdfValue(student, column.id)]))),
    theme: 'plain',
    margin: { top: 38, bottom: 16, left: 12, right: 12 },
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak', valign: 'top' },
    headStyles: { fontStyle: 'bold' },
    columnStyles: wide ? Object.fromEntries(columns.map(column => [column.id, { cellWidth: column.width }])) : {},
    horizontalPageBreak: wide,
    horizontalPageBreakRepeat: selected.includes('name') ? 'name' : undefined,
    rowPageBreak: 'avoid',
    didDrawPage: () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(doc.splitTextToSize(centerName, availableWidth).slice(0, 2), 12, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Student Details', 12, 25);
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(`${scope} | ${students.length} students | ${new Date().toLocaleDateString('en-IN')}`, availableWidth).slice(0, 2), 12, 31);
    },
  });
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.getWidth() - 12, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
  }
  return doc.output('blob');
}

export async function deliverStudentPdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if ((error as DOMException).name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}