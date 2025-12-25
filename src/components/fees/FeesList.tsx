import React, { useState, useMemo } from 'react';
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
  X
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
import { FloatingActionButton } from './FloatingActionButton';
import { FeeCard } from './FeeCard';
import { getStatusBadge } from './feeHelpers';

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

interface FeesListProps {
  students: Student[];
  fees: StudentFee[];
  classFees: ClassFee[];
  payments: FeePayment[];
  onAddFee: (fee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFeeStatus: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
  onRecordPayment: (feeId: string, amount: number, paymentMethod: string, reference?: string, notes?: string) => void;
}

export function FeesList({
  students,
  fees,
  classFees,
  payments,
  onAddFee,
  onUpdateFeeStatus,
  onRecordPayment
}: FeesListProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [selectedClass, setSelectedClass] = useState<string>('All');
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

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function generateMonthlyFees() {
    if (classFees.length === 0 || classFees.every(cf => cf.amount === 0)) {
      toast.error('Please set class fees first');
      return;
    }

    const currentMonth = getCurrentMonth();
    const currentYear = new Date().getFullYear();
    let feesGenerated = 0;

    students.forEach(student => {
      const existingFee = fees.find(f => f.studentId === student.id && f.feeType === `Monthly Fee - ${currentMonth}`);
      if (!existingFee) {
        const classFee = classFees.find(cf => cf.class === student.class);
        const feeAmount = classFee ? classFee.amount : 0;
        if (feeAmount > 0) {
          const dueDate = new Date(currentYear, new Date().getMonth(), 5);
          onAddFee({
            studentId: student.id,
            feeType: `Monthly Fee - ${currentMonth}`,
            amount: feeAmount,
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'unpaid'
          });
          feesGenerated++;
        }
      }
    });

    if (feesGenerated > 0) {
      toast.success(`Generated fees for ${feesGenerated} students`);
    } else {
      toast.info('All students already have fees for this month');
    }
  }

  const getAvailableMonths = () => {
    const months = [];
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
  };

  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort();

  const filteredFees = useMemo(() => {
    return fees.filter(fee => {
      const student = students.find(s => s.id === fee.studentId);
      const studentMatch = selectedStudent === 'All' || fee.studentId === selectedStudent;
      const monthMatch = fee.feeType?.includes(selectedMonth) ||
        (fee.feeType === 'monthly' && fee.dueDate?.startsWith(selectedMonth));
      const classMatch = selectedClass === 'All' || (student && student.class === selectedClass);
      const statusMatch = statusFilter === 'All' || fee.status === statusFilter;
      const searchMatch = searchQuery === '' || (student && student.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return studentMatch && monthMatch && classMatch && statusMatch && searchMatch;
    });
  }, [fees, students, selectedStudent, selectedMonth, selectedClass, statusFilter, searchQuery]);

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown';
  };

  const getStudentClass = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.class || '-';
  };

  const getStudent = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getFeePayments = (feeId: string) => {
    return payments.filter(p => p.feeId === feeId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getTotalPaid = (feeId: string) => {
    return payments.filter(p => p.feeId === feeId).reduce((sum, p) => sum + p.amount, 0);
  };

  const handleMarkAsPaid = (feeId: string) => {
    onUpdateFeeStatus(feeId, 'paid', new Date().toISOString().split('T')[0]);
    toast.success('Fee marked as paid');
  };

  const handleBulkMarkPaid = () => {
    if (selectedFees.size === 0) {
      toast.error('No fees selected');
      return;
    }
    selectedFees.forEach(feeId => {
      onUpdateFeeStatus(feeId, 'paid', new Date().toISOString().split('T')[0]);
    });
    toast.success(`${selectedFees.size} fees marked as paid`);
    setSelectedFees(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unpaidFeeIds = filteredFees.filter(f => f.status !== 'paid').map(f => f.id);
      setSelectedFees(new Set(unpaidFeeIds));
    } else {
      setSelectedFees(new Set());
    }
  };

  const handleSelectFee = (feeId: string, checked: boolean) => {
    const newSelected = new Set(selectedFees);
    if (checked) {
      newSelected.add(feeId);
    } else {
      newSelected.delete(feeId);
    }
    setSelectedFees(newSelected);
  };

  const handleRecordPayment = (fee: StudentFee) => {
    setSelectedFeeForPayment(fee);
    setPaymentDialogOpen(true);
  };

  const handleViewHistory = (fee: StudentFee) => {
    setSelectedFeeForHistory(fee);
    setHistoryDialogOpen(true);
  };

  const handleSendReminder = (studentId: string) => {
    const student = getStudent(studentId);
    if (student) {
      setSelectedStudentForReminder(student);
      setWhatsappDialogOpen(true);
    }
  };



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

  const totalAmount = filteredFees.reduce((sum, f) => sum + f.amount, 0);
  const paidAmount = filteredFees.reduce((sum, f) => sum + getTotalPaid(f.id), 0);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedMonth !== getCurrentMonth()) count++;
    if (selectedClass !== 'All') count++;
    if (statusFilter !== 'All') count++;
    if (selectedStudent !== 'All') count++;
    if (searchQuery !== '') count++;
    return count;
  }, [selectedMonth, selectedClass, statusFilter, selectedStudent, searchQuery]);

  const clearFilters = () => {
    setSelectedMonth(getCurrentMonth());
    setSelectedClass('All');
    setStatusFilter('All');
    setSelectedStudent('All');
    setSearchQuery('');
  };

  // Filter component (reusable)
  const FilterContent = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Month</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableMonths().map(month => (
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
          <Button onClick={generateMonthlyFees} size="sm" className="text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Generate Fees</span>
            <span className="sm:hidden">Generate</span>
          </Button>
          {selectedFees.size > 0 && (
            <Button onClick={handleBulkMarkPaid} size="sm" variant="outline" className="text-xs sm:text-sm">
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
                <FilterContent />
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
                {getAvailableMonths().map(month => (
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
          {selectedMonth !== getCurrentMonth() && (
            <Badge variant="secondary" className="gap-1">
              Month: {getAvailableMonths().find(m => m.value === selectedMonth)?.label.split(' ')[0]}
              <button onClick={() => setSelectedMonth(getCurrentMonth())} className="ml-1">
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
                              <DropdownMenuItem onClick={() => handleViewHistory(fee)}>
                                <History className="h-4 w-4 mr-2" />
                                Payment History {paymentCount > 0 && `(${paymentCount})`}
                              </DropdownMenuItem>
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
                onSelect={(checked) => handleSelectFee(fee.id, checked)}
                onMarkAsPaid={() => handleMarkAsPaid(fee.id)}
                onRecordPayment={() => handleRecordPayment(fee)}
                onSendReminder={() => handleSendReminder(fee.studentId)}
                onViewHistory={() => handleViewHistory(fee)}
              />
            );
          })
        )}
      </div>

      {/* Payment Dialog */}
      {selectedFeeForPayment && (
        <RecordPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          fee={selectedFeeForPayment}
          studentName={getStudentName(selectedFeeForPayment.studentId)}
          existingPayments={getFeePayments(selectedFeeForPayment.id)}
          onRecordPayment={(amount, method, reference, notes) => {
            onRecordPayment(selectedFeeForPayment.id, amount, method, reference, notes);
            setPaymentDialogOpen(false);
            setSelectedFeeForPayment(null);
          }}
        />
      )}

      {/* Payment History Dialog */}
      {selectedFeeForHistory && (
        <PaymentHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          fee={selectedFeeForHistory}
          studentName={getStudentName(selectedFeeForHistory.studentId)}
          payments={getFeePayments(selectedFeeForHistory.id)}
        />
      )}

      {/* WhatsApp Reminder Dialog */}
      {selectedStudentForReminder && (
        <WhatsAppReminderDialog
          open={whatsappDialogOpen}
          onOpenChange={setWhatsappDialogOpen}
          student={selectedStudentForReminder}
          unpaidFees={fees.filter(f => f.studentId === selectedStudentForReminder.id && f.status !== 'paid')}
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
        onGenerateFees={generateMonthlyFees}
        showGenerateFees={true}
      />
    </div>
  );
}
