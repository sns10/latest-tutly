import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Student, StudentFee, ClassFee } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Download,
  Calendar,
  CreditCard,
  MessageSquare,
  MoreHorizontal,
  History,
  Filter,
  X,
  Printer
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { WhatsAppReminderDialog } from './WhatsAppReminderDialog';
import { PaymentHistoryDialog } from './PaymentHistoryDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FloatingActionButton } from './FloatingActionButton';
import { FeeCard } from './FeeCard';
import { FeeReceipt } from './FeeReceipt';
import { getStatusBadge } from './feeHelpers';
import { useTuitionInfo } from '@/hooks/useTuitionInfo';
import { restoreBodyPointerEvents } from '@/lib/dialogSafety';

interface FeePayment {
  id: string;
  feeId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
}

// Module-scope stable empty array so getFeePayments() returns the same
// reference for every fee without payments. Avoids spurious re-renders of
// child dialogs that include the payments list in their prop set.
const EMPTY_PAYMENTS: FeePayment[] = [];

interface FeesListProps {
  students: Student[];
  fees: StudentFee[];
  classFees: ClassFee[];
  payments: FeePayment[];
  divisions?: { id: string; name: string; class: string }[];
  onAddFee: (fee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddFeesBatch?: (fees: Array<Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onUpdateFeeStatus: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
  onRecordPayment: (feeId: string, amount: number, paymentMethod: string, reference?: string, notes?: string, paymentDate?: string) => void;
  isRecordingPayment?: boolean;
  isAddingFees?: boolean;
}

export function FeesList({
  students,
  fees,
  classFees,
  payments,
  divisions = [],
  onAddFee,
  onAddFeesBatch,
  onUpdateFeeStatus,
  onRecordPayment,
  isRecordingPayment = false,
  isAddingFees = false,
}: FeesListProps) {
  const { tuition } = useTuitionInfo();
  const [selectedStudent, setSelectedStudent] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<StudentFee | null>(null);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedStudentForReminder, setSelectedStudentForReminder] = useState<Student | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedFeeForHistory, setSelectedFeeForHistory] = useState<StudentFee | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Receipt state — opened ONLY via explicit user action (row menu / history).
  // We intentionally do NOT auto-open the receipt after a payment is recorded
  // because chaining one Radix dialog close into another open caused a stuck
  // body pointer-events lock on some laptops (page scrolled but no clicks).
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptFee, setReceiptFee] = useState<StudentFee | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<FeePayment | null>(null);

  // Debounce search input so each keystroke doesn't trigger a full re-render of every row.
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ----- Lookup maps (built once per data change) -----
  const studentsById = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  const paymentsByFeeId = useMemo(() => {
    const m = new Map<string, FeePayment[]>();
    for (const p of payments) {
      const arr = m.get(p.feeId);
      if (arr) arr.push(p);
      else m.set(p.feeId, [p]);
    }
    // Sort each list desc by createdAt once
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return m;
  }, [payments]);

  const totalPaidByFeeId = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      m.set(p.feeId, (m.get(p.feeId) || 0) + Number(p.amount));
    }
    return m;
  }, [payments]);

  // Memoize current month to avoid function recreation
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Belt-and-braces: whenever ANY of the fee dialogs close, restore the body
  // pointer-events lock that Radix can leave behind when one dialog's close
  // animation overlaps another's mount.
  const unlockBody = useCallback(() => {
    restoreBodyPointerEvents();
    setTimeout(restoreBodyPointerEvents, 50);
    setTimeout(restoreBodyPointerEvents, 250);
  }, []);

  // Centralised close handlers — clear the selected entity AND unlock the body.
  const closePaymentDialog = useCallback((open: boolean) => {
    setPaymentDialogOpen(open);
    if (!open) {
      setSelectedFeeForPayment(null);
      unlockBody();
    }
  }, [unlockBody]);

  const closeHistoryDialog = useCallback((open: boolean) => {
    setHistoryDialogOpen(open);
    if (!open) {
      setSelectedFeeForHistory(null);
      unlockBody();
    }
  }, [unlockBody]);

  const closeWhatsappDialog = useCallback((open: boolean) => {
    setWhatsappDialogOpen(open);
    if (!open) {
      setSelectedStudentForReminder(null);
      unlockBody();
    }
  }, [unlockBody]);

  const closeReceiptDialog = useCallback((open: boolean) => {
    setReceiptOpen(open);
    if (!open) {
      setReceiptFee(null);
      setReceiptPayment(null);
      unlockBody();
    }
  }, [unlockBody]);

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function generateMonthlyFees(targetMonth?: string) {
    if (classFees.length === 0 || classFees.every(cf => cf.amount === 0)) {
      toast.error('Please set class fees first');
      return;
    }

    const monthStr = targetMonth || getCurrentMonth();
    const [yearPart, monthPart] = monthStr.split('-').map(Number);
    const dueDate = new Date(yearPart, monthPart - 1, 5);
    const feesToCreate: Array<Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const targetFeeType = `Monthly Fee - ${monthStr}`;

    // Pre-build lookup structures so the loop is O(N) instead of O(students × fees).
    // Prevents UI freeze on tuitions with hundreds of students × months of history.
    const existingForMonth = new Set<string>();
    for (const f of fees) {
      if (f.feeType === targetFeeType) existingForMonth.add(f.studentId);
    }
    const classFeeByClass = new Map<string, number>();
    for (const cf of classFees) classFeeByClass.set(cf.class, cf.amount);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    for (const student of students) {
      if (existingForMonth.has(student.id)) continue;
      const feeAmount = classFeeByClass.get(student.class) || 0;
      if (feeAmount > 0) {
        feesToCreate.push({
          studentId: student.id,
          feeType: targetFeeType,
          amount: feeAmount,
          dueDate: dueDateStr,
          status: 'unpaid'
        });
      }
    }

    if (feesToCreate.length > 0) {
      if (onAddFeesBatch) {
        onAddFeesBatch(feesToCreate);
      } else {
        // Fallback to individual adds if batch not available
        feesToCreate.forEach(fee => onAddFee(fee));
        toast.success(`Generated fees for ${feesToCreate.length} students`);
      }
    } else {
      toast.info('All students already have fees for the selected month');
    }
  }

  const availableMonths = useMemo(() => {
    const months: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        value: monthStr,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  }, []);

  const getAvailableMonths = () => availableMonths;

  const uniqueClasses = useMemo(
    () => Array.from(new Set(students.map(s => s.class))).sort(),
    [students]
  );

  const filteredFees = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    const monthStart = `${selectedMonth}-01`;
    const [my, mm] = selectedMonth.split('-').map(Number);
    const monthEnd = new Date(my, mm, 0).toISOString().split('T')[0]; // last day
    return fees.filter(fee => {
      const student = studentsById.get(fee.studentId);
      const studentMatch = selectedStudent === 'All' || fee.studentId === selectedStudent;
      // Match if the fee_type label embeds the month (monthly fees) OR if dueDate falls in the month (custom fees).
      const monthMatch =
        (fee.feeType && fee.feeType.includes(selectedMonth)) ||
        (fee.dueDate >= monthStart && fee.dueDate <= monthEnd);
      const classMatch = selectedClass === 'All' || (student && student.class === selectedClass);
      const divisionMatch = selectedDivision === 'All' || (student && student.divisionId === selectedDivision);
      const statusMatch = statusFilter === 'All' || fee.status === statusFilter;
      const searchMatch = search === '' || (student && student.name.toLowerCase().includes(search));
      return studentMatch && monthMatch && classMatch && divisionMatch && statusMatch && searchMatch;
    });
  }, [fees, studentsById, selectedStudent, selectedMonth, selectedClass, selectedDivision, statusFilter, debouncedSearch]);

  const getStudentName = (studentId: string) =>
    studentsById.get(studentId)?.name || 'Unknown';

  const getStudentClass = (studentId: string) =>
    studentsById.get(studentId)?.class || '-';

  const getStudent = (studentId: string) => studentsById.get(studentId);

  const getFeePayments = (feeId: string) =>
    paymentsByFeeId.get(feeId) || EMPTY_PAYMENTS;

  const getTotalPaid = (feeId: string) => totalPaidByFeeId.get(feeId) || 0;

  const handleMarkAsPaid = useCallback((feeId: string) => {
    const fee = fees.find((f) => f.id === feeId);
    const paidDate = new Date().toISOString().split('T')[0];

    // If we can't locate the fee record, fall back to just updating status.
    if (!fee) {
      onUpdateFeeStatus(feeId, 'paid', paidDate);
      toast.success('Fee marked as paid');
      return;
    }

    // Keep data accurate: "Paid" should always have a matching payment entry.
    const totalPaid = getTotalPaid(feeId);
    const remaining = fee.amount - totalPaid;

    if (remaining > 0) {
      onRecordPayment(feeId, remaining, 'cash', undefined, 'Marked as paid');
      return;
    }

    onUpdateFeeStatus(feeId, 'paid', paidDate);
    toast.success('Fee marked as paid');
  }, [fees, onUpdateFeeStatus, onRecordPayment, totalPaidByFeeId]);


  const handleBulkMarkPaid = useCallback(() => {
    if (selectedFees.size === 0) {
      toast.error('No fees selected');
      return;
    }
    const paidDate = new Date().toISOString().split('T')[0];
    selectedFees.forEach(feeId => {
      const fee = fees.find(f => f.id === feeId);
      if (!fee) {
        onUpdateFeeStatus(feeId, 'paid', paidDate);
        return;
      }
      const totalPaid = getTotalPaid(feeId);
      const remaining = fee.amount - totalPaid;
      if (remaining > 0) {
        // Record a payment entry so fee_payments stays consistent
        onRecordPayment(feeId, remaining, 'cash', undefined, 'Bulk marked as paid');
      } else if (remaining === 0) {
        onUpdateFeeStatus(feeId, 'paid', paidDate);
      } else {
        // remaining < 0 means an overpayment already exists; log & skip so we
        // don't silently mask the discrepancy.
        console.warn(`Bulk mark paid skipped fee ${feeId}: overpayment detected (remaining=${remaining})`);
      }
    });
    toast.success(`${selectedFees.size} fees marked as paid`);
    setSelectedFees(new Set());
  }, [selectedFees, fees, onUpdateFeeStatus, onRecordPayment, totalPaidByFeeId]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unpaidFeeIds = filteredFees.filter(f => f.status !== 'paid').map(f => f.id);
      setSelectedFees(new Set(unpaidFeeIds));
    } else {
      setSelectedFees(new Set());
    }
  };

  const handleSelectFee = useCallback((feeId: string, checked: boolean) => {
    setSelectedFees(prev => {
      const next = new Set(prev);
      if (checked) next.add(feeId); else next.delete(feeId);
      return next;
    });
  }, []);

  const handleRecordPayment = useCallback((fee: StudentFee) => {
    setSelectedFeeForPayment(fee);
    setPaymentDialogOpen(true);
  }, []);

  // Stable wrappers used by FeeCard so React.memo can short-circuit re-renders.
  const handleRecordPaymentById = useCallback((feeId: string) => {
    const fee = fees.find(f => f.id === feeId);
    if (fee) handleRecordPayment(fee);
  }, [fees, handleRecordPayment]);

  const handleViewHistory = useCallback((fee: StudentFee) => {
    setSelectedFeeForHistory(fee);
    setHistoryDialogOpen(true);
  }, []);

  const handleViewHistoryById = useCallback((feeId: string) => {
    const fee = fees.find(f => f.id === feeId);
    if (fee) handleViewHistory(fee);
  }, [fees, handleViewHistory]);

  const handleSendReminder = useCallback((studentId: string) => {
    const student = studentsById.get(studentId);
    if (student) {
      setSelectedStudentForReminder(student);
      setWhatsappDialogOpen(true);
    }
  }, [studentsById]);

  const handlePrintReceiptForFee = useCallback((feeId: string) => {
    const fee = fees.find(f => f.id === feeId);
    const feePayments = paymentsByFeeId.get(feeId);
    if (fee && feePayments && feePayments.length > 0) {
      setReceiptFee(fee);
      setReceiptPayment(feePayments[0]); // most recent
      setReceiptOpen(true);
    }
  }, [fees, paymentsByFeeId]);



  const exportToCSV = () => {
    const headers = ['Student', 'Class', 'Amount', 'Paid', 'Remaining', 'Due Date', 'Status', 'Paid Date'];
    const rows = filteredFees.map(fee => {
      const totalPaid = getTotalPaid(fee.id);
      return [
        getStudentName(fee.studentId),
        getStudentClass(fee.studentId),
        fee.amount,
        totalPaid,
        fee.amount - totalPaid,
        fee.dueDate,
        fee.status,
        fee.paidDate || '-'
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const { totalAmount, paidAmount } = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const f of filteredFees) {
      total += f.amount;
      paid += totalPaidByFeeId.get(f.id) || 0;
    }
    return { totalAmount: total, paidAmount: paid };
  }, [filteredFees, totalPaidByFeeId]);

  // Count active filters - use currentMonth memo instead of function call
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedMonth !== currentMonth) count++;
    if (selectedClass !== 'All') count++;
    if (selectedDivision !== 'All') count++;
    if (statusFilter !== 'All') count++;
    if (selectedStudent !== 'All') count++;
    if (searchQuery !== '') count++;
    return count;
  }, [selectedMonth, selectedClass, selectedDivision, statusFilter, selectedStudent, searchQuery, currentMonth]);

  // Get divisions for selected class
  const filteredDivisions = useMemo(() => {
    if (selectedClass === 'All') return divisions;
    return divisions.filter(d => d.class === selectedClass);
  }, [divisions, selectedClass]);

  // Memoize the unpaid-fees list passed to the WhatsApp reminder dialog.
  const reminderUnpaidFees = useMemo(() => {
    if (!selectedStudentForReminder) return [] as StudentFee[];
    return fees.filter(f => f.studentId === selectedStudentForReminder.id && f.status !== 'paid');
  }, [fees, selectedStudentForReminder]);

  const clearFilters = () => {
    setSelectedMonth(currentMonth);
    setSelectedClass('All');
    setSelectedDivision('All');
    setStatusFilter('All');
    setSelectedStudent('All');
    setSearchQuery('');
  };

  // Filter panel JSX — assembled as a memoized node (NOT a component) so React
  // does not unmount/remount the entire subtree on every render of FeesList.
  // Defining a component inside another component's body would change the
  // component type identity on each render and tear down all child Selects.
  const filterContent = (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Month</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(month => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Classes</SelectItem>
              {uniqueClasses.map(className => (
                <SelectItem key={className} value={className}>{className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Division Filter */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Division</label>
          <Select value={selectedDivision} onValueChange={setSelectedDivision}>
            <SelectTrigger>
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Divisions</SelectItem>
              {filteredDivisions.map(div => (
                <SelectItem key={div.id} value={div.id}>{div.name} ({div.class})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Student</label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Students</SelectItem>
              {students
                .filter(s => selectedClass === 'All' || s.class === selectedClass)
                .map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} - {student.class}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          onClick={clearFilters}
          className="w-full"
          size="sm"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setGenerateDialogOpen(true)} size="sm" className="text-xs sm:text-sm" disabled={isAddingFees}>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Generate Fees</span>
            <span className="sm:hidden">Generate</span>
          </Button>
          {selectedFees.size > 0 && (
            <Button onClick={handleBulkMarkPaid} size="sm" variant="outline" className="text-xs sm:text-sm" disabled={isRecordingPayment}>
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Mark {selectedFees.size} as Paid</span>
              <span className="sm:hidden">Mark {selectedFees.size} Paid</span>
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {/* Mobile Filter Button */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="md:hidden">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Filter fees by month, class, status, and student
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                {filterContent}
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={exportToCSV} size="sm" variant="outline" className="text-xs sm:text-sm">
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Filters - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Classes</SelectItem>
                {uniqueClasses.map(className => (
                  <SelectItem key={className} value={className}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <div className="col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filter Chips - Mobile */}
      {activeFilterCount > 0 && (
        <div className="md:hidden flex flex-wrap gap-2">
          {selectedMonth !== currentMonth && (
            <Badge variant="secondary" className="gap-1">
              Month: {availableMonths.find(m => m.value === selectedMonth)?.label.split(' ')[0]}
              <button onClick={() => setSelectedMonth(currentMonth)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedClass !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Class: {selectedClass}
              <button onClick={() => setSelectedClass('All')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter('All')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery !== '' && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <button onClick={() => setSearchQuery('')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
        <span className="text-muted-foreground">
          Showing <strong>{filteredFees.length}</strong> records
        </span>
        <span className="text-muted-foreground hidden sm:inline">•</span>
        <span>Total: <strong>₹{totalAmount.toLocaleString('en-IN')}</strong></span>
        <span className="text-muted-foreground hidden sm:inline">•</span>
        <span className="text-green-600">Collected: <strong>₹{paidAmount.toLocaleString('en-IN')}</strong></span>
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedFees.size > 0 && selectedFees.size === filteredFees.filter(f => f.status !== 'paid').length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No fees found. {classFees.length === 0 ? 'Set class fees first.' : 'Click "Generate Fees" to create fee records.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFees.map(fee => {
                    const totalPaid = getTotalPaid(fee.id);
                    const remaining = fee.amount - totalPaid;
                    const paymentCount = getFeePayments(fee.id).length;

                    return (
                      <TableRow key={fee.id}>
                        <TableCell>
                          {fee.status !== 'paid' && (
                            <Checkbox
                              checked={selectedFees.has(fee.id)}
                              onCheckedChange={(checked) => handleSelectFee(fee.id, checked as boolean)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{getStudentName(fee.studentId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getStudentClass(fee.studentId)}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">₹{fee.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={totalPaid > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                              ₹{totalPaid.toLocaleString('en-IN')}
                            </span>
                            {remaining > 0 && totalPaid > 0 && (
                              <span className="text-xs text-yellow-600">
                                ₹{remaining.toLocaleString('en-IN')} due
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(fee.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {fee.status !== 'paid' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleMarkAsPaid(fee.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRecordPayment(fee)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendReminder(fee.studentId)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}

                              {/* If a fee was marked paid without a payment entry, allow adding it for accurate history/receipts */}
                              {fee.status === 'paid' && paymentCount === 0 && (
                                <>
                                  <DropdownMenuItem onClick={() => handleRecordPayment(fee)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}

                              <DropdownMenuItem onClick={() => handleViewHistory(fee)}>
                                <History className="h-4 w-4 mr-2" />
                                Payment History {paymentCount > 0 && `(${paymentCount})`}
                              </DropdownMenuItem>
                              {paymentCount > 0 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const feePayments = getFeePayments(fee.id);
                                    if (feePayments.length > 0) {
                                      setReceiptFee(fee);
                                      setReceiptPayment(feePayments[0]);
                                      setReceiptOpen(true);
                                    }
                                  }}
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Receipt
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredFees.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No fees found. {classFees.length === 0 ? 'Set class fees first.' : 'Click "Generate Fees" to create fee records.'}
            </CardContent>
          </Card>
        ) : (
          filteredFees.map(fee => {
            const totalPaid = getTotalPaid(fee.id);
            const remaining = fee.amount - totalPaid;
            const paymentCount = getFeePayments(fee.id).length;

            return (
              <FeeCard
                key={fee.id}
                fee={fee}
                studentName={getStudentName(fee.studentId)}
                studentClass={getStudentClass(fee.studentId)}
                totalPaid={totalPaid}
                remaining={remaining}
                paymentCount={paymentCount}
                isSelected={selectedFees.has(fee.id)}
                onSelect={handleSelectFee}
                onMarkAsPaid={handleMarkAsPaid}
                onRecordPayment={handleRecordPaymentById}
                onSendReminder={handleSendReminder}
                onViewHistory={handleViewHistoryById}
                onPrintReceipt={paymentCount > 0 ? handlePrintReceiptForFee : undefined}
              />
            );
          })
        )}
      </div>

      {/* Payment Dialog */}
      {selectedFeeForPayment && (
        <RecordPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={closePaymentDialog}
          fee={selectedFeeForPayment}
          studentName={getStudentName(selectedFeeForPayment.studentId)}
          existingPayments={getFeePayments(selectedFeeForPayment.id)}
          isPending={isRecordingPayment}
          onRecordPayment={(amount, method, reference, notes, paymentDate) => {
            const feeId = selectedFeeForPayment.id;
            // Close the dialog (clears selection + unlocks body) BEFORE the
            // mutation fires so its teardown does not race with the cache
            // refetch. Receipt can be opened later via the row menu.
            closePaymentDialog(false);
            onRecordPayment(feeId, amount, method, reference, notes, paymentDate);
          }}
        />
      )}
      
      {/* Receipt — opened only via explicit user action (row menu / history) */}
      {receiptFee && receiptPayment && (
        <FeeReceipt
          open={receiptOpen}
          onOpenChange={closeReceiptDialog}
          fee={receiptFee}
          studentName={getStudentName(receiptFee.studentId)}
          studentClass={getStudentClass(receiptFee.studentId)}
          payment={receiptPayment}
          existingPayments={getFeePayments(receiptFee.id)}
          tuition={tuition}
          receiptNumber={`RCP-${receiptPayment.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`}
        />
      )}

      {/* Payment History Dialog */}
      {selectedFeeForHistory && (
        <PaymentHistoryDialog
          open={historyDialogOpen}
          onOpenChange={closeHistoryDialog}
          fee={selectedFeeForHistory}
          studentName={getStudentName(selectedFeeForHistory.studentId)}
          studentClass={getStudentClass(selectedFeeForHistory.studentId)}
          payments={getFeePayments(selectedFeeForHistory.id)}
          tuition={tuition}
        />
      )}

      {/* WhatsApp Reminder Dialog */}
      {selectedStudentForReminder && (
        <WhatsAppReminderDialog
          open={whatsappDialogOpen}
          onOpenChange={closeWhatsappDialog}
          student={selectedStudentForReminder}
          unpaidFees={reminderUnpaidFees}
          totalPaidByFeeId={totalPaidByFeeId}
        />
      )}

      {/* Floating Action Button - Mobile Only */}
      <FloatingActionButton
        onRecordPayment={() => {
          // Open payment dialog for first unpaid fee if available (search unfiltered fees)
          const unpaidFee = fees.find(f => f.status !== 'paid');
          if (unpaidFee) {
            handleRecordPayment(unpaidFee);
          } else {
            toast.info('No unpaid fees to record payment for');
          }
        }}
        onGenerateFees={() => setGenerateDialogOpen(true)}
        showGenerateFees={true}
      />

      {/* Generate Monthly Fees - month picker */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Monthly Fees</DialogTitle>
            <DialogDescription>
              Pick the month to generate fees for. Existing fees for that month are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={generateMonth} onValueChange={setGenerateMonth}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {availableMonths.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} disabled={isAddingFees}>Cancel</Button>
            <Button
              disabled={isAddingFees}
              onClick={() => {
                generateMonthlyFees(generateMonth);
                setGenerateDialogOpen(false);
              }}
            >
              {isAddingFees ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
