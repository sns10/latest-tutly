import React, { useState, useMemo } from 'react';
import { Student, StudentFee, ClassFee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Search,
  Download,
  Calendar,
  CreditCard,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { WhatsAppReminderDialog } from './WhatsAppReminderDialog';

interface FeesListProps {
  students: Student[];
  fees: StudentFee[];
  classFees: ClassFee[];
  onAddFee: (fee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFeeStatus: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
  onRecordPayment?: (feeId: string, amount: number, paymentMethod: string, reference?: string) => void;
}

export function FeesList({
  students,
  fees,
  classFees,
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

  const handleSendReminder = (studentId: string) => {
    const student = getStudent(studentId);
    if (student) {
      setSelectedStudentForReminder(student);
      setWhatsappDialogOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><Clock className="h-3 w-3 mr-1" />Unpaid</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Student', 'Class', 'Amount', 'Due Date', 'Status', 'Paid Date'];
    const rows = filteredFees.map(fee => [
      getStudentName(fee.studentId),
      getStudentClass(fee.studentId),
      fee.amount,
      fee.dueDate,
      fee.status,
      fee.paidDate || '-'
    ]);
    
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
  const paidAmount = filteredFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateMonthlyFees} size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Generate Fees
          </Button>
          {selectedFees.size > 0 && (
            <Button onClick={handleBulkMarkPaid} size="sm" variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark {selectedFees.size} as Paid
            </Button>
          )}
        </div>
        <Button onClick={exportToCSV} size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

            <div className="col-span-2 md:col-span-2 relative">
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

      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-muted-foreground">
          Showing <strong>{filteredFees.length}</strong> records
        </span>
        <span className="text-muted-foreground">•</span>
        <span>Total: <strong>₹{totalAmount.toLocaleString('en-IN')}</strong></span>
        <span className="text-muted-foreground">•</span>
        <span className="text-green-600">Collected: <strong>₹{paidAmount.toLocaleString('en-IN')}</strong></span>
      </div>

      {/* Table */}
      <Card>
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
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
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
                  filteredFees.map(fee => (
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
                      <TableCell>{new Date(fee.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(fee.status)}</TableCell>
                      <TableCell>{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-'}</TableCell>
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
                              </>
                            )}
                            {fee.status === 'paid' && (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                No actions available
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {selectedFeeForPayment && (
        <RecordPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          fee={selectedFeeForPayment}
          studentName={getStudentName(selectedFeeForPayment.studentId)}
          onRecordPayment={(amount, method, reference) => {
            if (onRecordPayment) {
              onRecordPayment(selectedFeeForPayment.id, amount, method, reference);
            } else {
              onUpdateFeeStatus(selectedFeeForPayment.id, 'paid', new Date().toISOString().split('T')[0]);
            }
            setPaymentDialogOpen(false);
            setSelectedFeeForPayment(null);
          }}
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
    </div>
  );
}
