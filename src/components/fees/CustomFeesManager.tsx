import React, { useState, useMemo } from 'react';
import { Student, StudentFee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Trash2,
  DollarSign,
  Users,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';

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

interface CustomFeesManagerProps {
  students: Student[];
  fees: StudentFee[];
  payments: FeePayment[];
  onUpdateFeeStatus: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
  onDeleteFee: (feeId: string) => void;
  onAddCustomFee: () => void;
}

export function CustomFeesManager({
  students,
  fees,
  payments,
  onUpdateFeeStatus,
  onDeleteFee,
  onAddCustomFee,
}: CustomFeesManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>('All');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<StudentFee | null>(null);

  // Filter custom fees (non-monthly fees)
  const customFees = useMemo(() => {
    return fees.filter(fee => !fee.feeType?.includes('Monthly Fee'));
  }, [fees]);

  // Get unique fee types
  const feeTypes = useMemo(() => {
    const types = new Set(customFees.map(f => f.feeType));
    return Array.from(types).sort();
  }, [customFees]);

  // Filtered fees
  const filteredFees = useMemo(() => {
    return customFees.filter(fee => {
      const student = students.find(s => s.id === fee.studentId);
      const searchMatch =
        searchQuery === '' ||
        (student && student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        fee.feeType?.toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = statusFilter === 'All' || fee.status === statusFilter;
      const typeMatch = feeTypeFilter === 'All' || fee.feeType === feeTypeFilter;
      return searchMatch && statusMatch && typeMatch;
    });
  }, [customFees, students, searchQuery, statusFilter, feeTypeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = customFees.length;
    const paid = customFees.filter(f => f.status === 'paid').length;
    const unpaid = customFees.filter(f => f.status === 'unpaid').length;
    const partial = customFees.filter(f => f.status === 'partial').length;
    const overdue = customFees.filter(f => f.status === 'overdue').length;
    const totalAmount = customFees.reduce((sum, f) => sum + f.amount, 0);
    const collectedAmount = customFees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0);
    const partialAmount = customFees
      .filter(f => f.status === 'partial')
      .reduce((sum, f) => {
        const feePayments = payments.filter(p => p.feeId === f.id);
        return sum + feePayments.reduce((s, p) => s + p.amount, 0);
      }, 0);

    return { total, paid, unpaid, partial, overdue, totalAmount, collectedAmount: collectedAmount + partialAmount };
  }, [customFees, payments]);

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown';
  };

  const getStudentClass = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.class || '-';
  };

  const handleMarkAsPaid = (fee: StudentFee) => {
    onUpdateFeeStatus(fee.id, 'paid', new Date().toISOString().split('T')[0]);
    toast.success('Fee marked as paid');
  };

  const handleMarkAsUnpaid = (fee: StudentFee) => {
    onUpdateFeeStatus(fee.id, 'unpaid');
    toast.success('Fee marked as unpaid');
  };

  const handleDeleteClick = (fee: StudentFee) => {
    setFeeToDelete(fee);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (feeToDelete) {
      onDeleteFee(feeToDelete.id);
      toast.success('Fee deleted successfully');
    }
    setDeleteConfirmOpen(false);
    setFeeToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Unpaid
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Custom Fees</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unpaid</p>
                <p className="text-xl font-bold text-yellow-600">{stats.unpaid + stats.partial}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-xl font-bold">₹{stats.collectedAmount.toLocaleString('en-IN')}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button onClick={onAddCustomFee} size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Custom Fee
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student or fee type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={feeTypeFilter} onValueChange={setFeeTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Fee Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                {feeTypes.map(type => (
                  <SelectItem key={type} value={type || 'unknown'}>
                    {type}
                  </SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Fees Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No custom fees found. Click "Add Custom Fee" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFees.map(fee => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">{getStudentName(fee.studentId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getStudentClass(fee.studentId)}</Badge>
                      </TableCell>
                      <TableCell>{fee.feeType}</TableCell>
                      <TableCell className="font-semibold">
                        ₹{fee.amount.toLocaleString('en-IN')}
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
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(fee)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {fee.status === 'paid' && (
                              <DropdownMenuItem onClick={() => handleMarkAsUnpaid(fee)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Mark as Unpaid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(fee)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Fee
                            </DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fee? This action cannot be undone.
              {feeToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>{getStudentName(feeToDelete.studentId)}</strong> - {feeToDelete.feeType}
                  <br />
                  Amount: ₹{feeToDelete.amount.toLocaleString('en-IN')}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
