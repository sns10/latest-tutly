import React, { useState, useEffect } from 'react';
import { Student, StudentFee, ClassName } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
interface ClassFee {
  class: ClassName;
  amount: number;
}
interface FeeManagementProps {
  students: Student[];
  fees: StudentFee[];
  classFees: ClassFee[];
  onAddFee: (fee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFeeStatus: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
}
export function FeeManagement({
  students,
  fees,
  classFees,
  onAddFee,
  onUpdateFeeStatus
}: FeeManagementProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Generate monthly fees for all students
  useEffect(() => {
    if (students.length > 0 && classFees.length > 0) {
      generateMonthlyFees();
    }
  }, [students, classFees]);
  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  function generateMonthlyFees() {
    const currentMonth = getCurrentMonth();
    const currentYear = new Date().getFullYear();
    students.forEach(student => {
      const existingFee = fees.find(f => f.studentId === student.id && f.feeType === `Monthly Fee - ${currentMonth}`);
      if (!existingFee) {
        const classFee = classFees.find(cf => cf.class === student.class);
        const feeAmount = classFee ? classFee.amount : 0;
        if (feeAmount > 0) {
          const dueDate = new Date(currentYear, new Date().getMonth(), 5); // 5th of current month
          onAddFee({
            studentId: student.id,
            feeType: `Monthly Fee - ${currentMonth}`,
            amount: feeAmount,
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'unpaid'
          });
        }
      }
    });
  }

  // Get months for filter (last 12 months)
  const getAvailableMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        value: monthStr,
        label: date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        })
      });
    }
    return months;
  };

  // Get unique classes from students
  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort();

  // Filter fees by student, month, class, status, and search
  const filteredFees = fees.filter(fee => {
    const student = students.find(s => s.id === fee.studentId);
    const studentMatch = selectedStudent === 'All' || fee.studentId === selectedStudent;
    const monthMatch = fee.feeType.includes(selectedMonth);
    const classMatch = selectedClass === 'All' || (student && student.class === selectedClass);
    const statusMatch = statusFilter === 'All' || fee.status === statusFilter;
    const searchMatch = searchQuery === '' || (student && student.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return studentMatch && monthMatch && classMatch && statusMatch && searchMatch;
  });

  // Get unpaid fees for current month
  const unpaidFeesThisMonth = fees.filter(f => f.status === 'unpaid' && f.feeType.includes(getCurrentMonth()));

  // Calculate statistics for current month
  const currentMonthFees = fees.filter(f => f.feeType.includes(selectedMonth));
  const totalAmount = currentMonthFees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidAmount = currentMonthFees.filter(f => f.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
  const unpaidAmount = currentMonthFees.filter(f => f.status === 'unpaid').reduce((sum, fee) => sum + fee.amount, 0);

  // Get student name by ID
  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };
  const handleMarkAsPaid = (feeId: string) => {
    onUpdateFeeStatus(feeId, 'paid', new Date().toISOString().split('T')[0]);
    toast.success('Fee marked as paid');
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'partial':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Fee Management</h2>
          <p className="text-muted-foreground">Track monthly fee payments for all students</p>
        </div>
        <Button onClick={generateMonthlyFees}>
          <Calendar className="h-4 w-4 mr-2" />
          Generate Current Month Fees
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total for {getAvailableMonths().find(m => m.value === selectedMonth)?.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">₹{paidAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">₹{unpaidAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Unpaid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{unpaidFeesThisMonth.length}</div>
            <div className="text-sm text-muted-foreground">Students Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Month:</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableMonths().map(month => <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Class:</span>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Classes</SelectItem>
                  {uniqueClasses.map(className => <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Student:</span>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Students</SelectItem>
                  {students
                    .filter(s => selectedClass === 'All' || s.class === selectedClass)
                    .map(student => <SelectItem key={student.id} value={student.id}>
                      {student.name} - {student.class}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
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
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium">Search:</span>
              <Input
                placeholder="Search by student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Fee Status - {getAvailableMonths().find(m => m.value === selectedMonth)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredFees.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                No fees found for the selected month and student filter.
              </div> : filteredFees.map(fee => <div key={fee.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{getStudentName(fee.studentId)}</span>
                      <Badge variant="outline" className="text-xs">
                        {students.find(s => s.id === fee.studentId)?.class}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Due: {new Date(fee.dueDate).toLocaleDateString()}
                      {fee.paidDate && ` | Paid: ${new Date(fee.paidDate).toLocaleDateString()}`}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold">₹{fee.amount.toFixed(2)}</div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(fee.status)}
                        <Badge variant={getStatusColor(fee.status)}>
                          {fee.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {fee.status !== 'paid' && <Button size="sm" onClick={() => handleMarkAsPaid(fee.id)}>
                        Mark Paid
                      </Button>}
                  </div>
                </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Fees Alert for Current Month */}
      {unpaidFeesThisMonth.length > 0 && selectedMonth === getCurrentMonth() && <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Students with Unpaid Fees This Month ({unpaidFeesThisMonth.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidFeesThisMonth.slice(0, 10).map(fee => <div key={fee.id} className="flex justify-between items-center p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium text-zinc-600">{getStudentName(fee.studentId)}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Due: {new Date(fee.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">₹{fee.amount.toFixed(2)}</span>
                    <Button size="sm" onClick={() => handleMarkAsPaid(fee.id)}>
                      Mark Paid
                    </Button>
                  </div>
                </div>)}
              {unpaidFeesThisMonth.length > 10 && <div className="text-sm text-muted-foreground">
                  And {unpaidFeesThisMonth.length - 10} more...
                </div>}
            </div>
          </CardContent>
        </Card>}
    </div>;
}