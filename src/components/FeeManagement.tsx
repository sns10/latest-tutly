
import React, { useState } from 'react';
import { Student, StudentFee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface FeeManagementProps {
  students: Student[];
  fees: StudentFee[];
  onAddFee: (fee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFeeStatus: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
}

export function FeeManagement({ students, fees, onAddFee, onUpdateFeeStatus }: FeeManagementProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>('All');
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [newFee, setNewFee] = useState({
    studentId: '',
    feeType: '',
    amount: '',
    dueDate: '',
    notes: ''
  });

  // Filter fees by student
  const filteredFees = selectedStudent === 'All' 
    ? fees 
    : fees.filter(f => f.studentId === selectedStudent);

  // Get unpaid fees
  const unpaidFees = fees.filter(f => f.status === 'unpaid' || f.status === 'overdue');

  // Calculate statistics
  const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidAmount = fees.filter(f => f.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
  const unpaidAmount = fees.filter(f => f.status === 'unpaid' || f.status === 'overdue').reduce((sum, fee) => sum + fee.amount, 0);

  // Get student name by ID
  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const handleAddFee = () => {
    if (!newFee.studentId || !newFee.feeType || !newFee.amount || !newFee.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    onAddFee({
      studentId: newFee.studentId,
      feeType: newFee.feeType,
      amount: parseFloat(newFee.amount),
      dueDate: newFee.dueDate,
      status: 'unpaid',
      notes: newFee.notes || undefined
    });

    setNewFee({
      studentId: '',
      feeType: '',
      amount: '',
      dueDate: '',
      notes: ''
    });
    setIsAddFeeOpen(false);
    toast.success('Fee added successfully');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Fee Management</h2>
          <p className="text-muted-foreground">Manage student fees and payments</p>
        </div>
        <Dialog open={isAddFeeOpen} onOpenChange={setIsAddFeeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Fee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="student">Student</Label>
                <Select value={newFee.studentId} onValueChange={(value) => setNewFee({...newFee, studentId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - {student.class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="feeType">Fee Type</Label>
                <Input
                  id="feeType"
                  value={newFee.feeType}
                  onChange={(e) => setNewFee({...newFee, feeType: e.target.value})}
                  placeholder="e.g., Tuition, Books, Lab Fee"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newFee.amount}
                  onChange={(e) => setNewFee({...newFee, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newFee.dueDate}
                  onChange={(e) => setNewFee({...newFee, dueDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newFee.notes}
                  onChange={(e) => setNewFee({...newFee, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>
              <Button onClick={handleAddFee} className="w-full">
                Add Fee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total Fees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">${paidAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">${unpaidAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Unpaid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{unpaidFees.length}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Label>Filter by Student:</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Students</SelectItem>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} - {student.class}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Fees Alert */}
      {unpaidFees.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Students with Unpaid Fees ({unpaidFees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidFees.slice(0, 5).map((fee) => (
                <div key={fee.id} className="flex justify-between items-center p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{getStudentName(fee.studentId)}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {fee.feeType} - Due: {new Date(fee.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">${fee.amount.toFixed(2)}</span>
                    <Button size="sm" onClick={() => handleMarkAsPaid(fee.id)}>
                      Mark Paid
                    </Button>
                  </div>
                </div>
              ))}
              {unpaidFees.length > 5 && (
                <div className="text-sm text-muted-foreground">
                  And {unpaidFees.length - 5} more...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee List */}
      <Card>
        <CardHeader>
          <CardTitle>All Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredFees.map((fee) => (
              <div key={fee.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{getStudentName(fee.studentId)}</span>
                    <Badge variant="outline" className="text-xs">
                      {students.find(s => s.id === fee.studentId)?.class}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{fee.feeType}</div>
                  <div className="text-sm text-muted-foreground">
                    Due: {new Date(fee.dueDate).toLocaleDateString()}
                    {fee.paidDate && ` | Paid: ${new Date(fee.paidDate).toLocaleDateString()}`}
                  </div>
                  {fee.notes && (
                    <div className="text-sm text-muted-foreground mt-1">{fee.notes}</div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold">${fee.amount.toFixed(2)}</div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(fee.status)}
                      <Badge variant={getStatusColor(fee.status)}>
                        {fee.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {fee.status !== 'paid' && (
                    <Button size="sm" onClick={() => handleMarkAsPaid(fee.id)}>
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
