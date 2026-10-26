import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createStudentPdf, deliverStudentPdf, DEFAULT_STUDENT_PDF_COLUMNS, STUDENT_PDF_COLUMNS, type StudentPdfColumn } from '@/lib/studentPdf';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  filteredStudents: Student[];
  centerName: string;
  filterLabel: string;
}

export function StudentPdfExportDialog({ open, onOpenChange, students, filteredStudents, centerName, filterLabel }: Props) {
  const [scope, setScope] = useState('filtered');
  const [columns, setColumns] = useState<StudentPdfColumn[]>(DEFAULT_STUDENT_PDF_COLUMNS);
  const [prepared, setPrepared] = useState<Blob | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const rows = scope === 'all' ? students : filteredStudents;

  useEffect(() => {
    let cancelled = false;
    setPrepared(null);
    setError('');
    if (!open || !rows.length || !columns.length) { setPreparing(false); return; }
    setPreparing(true);
    const timer = setTimeout(() => {
      try {
        const blob = createStudentPdf(rows, columns, centerName, scope === 'all' ? 'All students' : filterLabel);
        if (!cancelled) setPrepared(blob);
      } catch {
        if (!cancelled) setError('Could not prepare the PDF. Change your selection to retry.');
      } finally { if (!cancelled) setPreparing(false); }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, rows, columns, centerName, scope, filterLabel]);

  const download = async () => {
    if (!prepared) return;
    try {
      await deliverStudentPdf(prepared, `students-${scope}-${new Date().toLocaleDateString('en-CA')}.pdf`);
    } catch { toast.error('Unable to download the student PDF'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]" onOpenAutoFocus={event => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Export student PDF</DialogTitle>
          <DialogDescription>{rows.length} students · {columns.length} columns</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 min-w-0">
          <div className="space-y-2">
            <Label htmlFor="pdf-students">Students</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="pdf-students"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="filtered">Current filters ({filteredStudents.length})</SelectItem>
                <SelectItem value="all">All students ({students.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label>Columns</Label>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setColumns(STUDENT_PDF_COLUMNS.map(column => column.id))}>Select all</Button>
              <Button size="sm" variant="ghost" onClick={() => setColumns([])}>Clear</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {STUDENT_PDF_COLUMNS.map(column => (
              <label key={column.id} className="flex items-center gap-2 min-h-10 text-sm cursor-pointer">
                <Checkbox checked={columns.includes(column.id)} onCheckedChange={checked => setColumns(current => checked === true ? [...current, column.id] : current.filter(id => id !== column.id))} />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
          {!rows.length && <p className="text-sm text-destructive">No students match this selection.</p>}
          {!columns.length && <p className="text-sm text-destructive">Select at least one column.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={download} disabled={!prepared || preparing}>
            {preparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {preparing ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}