import React, { useState, useMemo } from 'react';
import { Student, StudentFee, ClassFee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface FeeReportsProps {
  students: Student[];
  fees: StudentFee[];
  classFees: ClassFee[];
}

type ReportType = 'monthly' | 'classwise' | 'defaulters' | 'collection';

export function FeeReports({ students, fees, classFees }: FeeReportsProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  // Monthly Collection Report
  const monthlyReport = useMemo(() => {
    const monthFees = fees.filter(f => 
      f.feeType?.includes(selectedMonth) || f.dueDate?.startsWith(selectedMonth)
    );

    const total = monthFees.reduce((sum, f) => sum + f.amount, 0);
    const paid = monthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const unpaid = monthFees.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
    const overdue = monthFees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0);

    return {
      total,
      paid,
      unpaid,
      overdue,
      collectionRate: total > 0 ? ((paid / total) * 100).toFixed(1) : '0',
      fees: monthFees
    };
  }, [fees, selectedMonth]);

  // Class-wise Report
  const classWiseReport = useMemo(() => {
    const classData: Record<string, {
      students: number;
      totalFees: number;
      collected: number;
      pending: number;
      collectionRate: string;
    }> = {};

    const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort();
    
    uniqueClasses.forEach(className => {
      const classStudents = students.filter(s => s.class === className);
      const classFee = classFees.find(cf => cf.class === className);
      
      const classFeeRecords = fees.filter(f => {
        const student = students.find(s => s.id === f.studentId);
        return student?.class === className;
      });

      const total = classFeeRecords.reduce((sum, f) => sum + f.amount, 0);
      const collected = classFeeRecords.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);

      classData[className] = {
        students: classStudents.length,
        totalFees: total,
        collected,
        pending: total - collected,
        collectionRate: total > 0 ? ((collected / total) * 100).toFixed(1) : '0'
      };
    });

    return classData;
  }, [students, fees, classFees]);

  // Defaulters Report
  const defaultersReport = useMemo(() => {
    const defaulters: {
      student: Student;
      unpaidCount: number;
      totalUnpaid: number;
      oldestDue: string;
    }[] = [];

    students.forEach(student => {
      const studentFees = fees.filter(f => 
        f.studentId === student.id && (f.status === 'unpaid' || f.status === 'overdue')
      );

      if (studentFees.length > 0) {
        const totalUnpaid = studentFees.reduce((sum, f) => sum + f.amount, 0);
        const oldestDue = studentFees.reduce((oldest, f) => 
          !oldest || new Date(f.dueDate) < new Date(oldest) ? f.dueDate : oldest
        , '');

        defaulters.push({
          student,
          unpaidCount: studentFees.length,
          totalUnpaid,
          oldestDue
        });
      }
    });

    return defaulters.sort((a, b) => b.totalUnpaid - a.totalUnpaid);
  }, [students, fees]);

  // Collection Trend (last 6 months)
  const collectionTrend = useMemo(() => {
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const monthFees = fees.filter(f => 
        f.feeType?.includes(monthStr) || f.dueDate?.startsWith(monthStr)
      );

      const total = monthFees.reduce((sum, f) => sum + f.amount, 0);
      const collected = monthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);

      trend.push({
        month: monthName,
        total,
        collected,
        rate: total > 0 ? ((collected / total) * 100).toFixed(1) : '0'
      });
    }
    return trend;
  }, [fees]);

  const exportToExcel = () => {
    let csvContent = '';
    let filename = '';

    if (selectedReport === 'monthly') {
      csvContent = 'Student,Class,Amount,Status,Due Date,Paid Date\n';
      monthlyReport.fees.forEach(fee => {
        const student = students.find(s => s.id === fee.studentId);
        csvContent += `"${student?.name || 'Unknown'}","${student?.class || '-'}",${fee.amount},${fee.status},${fee.dueDate},${fee.paidDate || '-'}\n`;
      });
      filename = `monthly-report-${selectedMonth}.csv`;
    } else if (selectedReport === 'classwise') {
      csvContent = 'Class,Students,Total Fees,Collected,Pending,Collection Rate\n';
      Object.entries(classWiseReport).forEach(([className, data]) => {
        csvContent += `"${className}",${data.students},${data.totalFees},${data.collected},${data.pending},${data.collectionRate}%\n`;
      });
      filename = 'class-wise-report.csv';
    } else if (selectedReport === 'defaulters') {
      csvContent = 'Student,Class,Unpaid Fees,Total Outstanding,Oldest Due Date\n';
      defaultersReport.forEach(d => {
        csvContent += `"${d.student.name}","${d.student.class}",${d.unpaidCount},${d.totalUnpaid},${d.oldestDue}\n`;
      });
      filename = 'defaulters-report.csv';
    } else {
      csvContent = 'Month,Total,Collected,Collection Rate\n';
      collectionTrend.forEach(t => {
        csvContent += `"${t.month}",${t.total},${t.collected},${t.rate}%\n`;
      });
      filename = 'collection-trend.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="space-y-6">
      {/* Report Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedReport === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedReport('monthly')}
                className="text-xs sm:text-sm"
              >
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Monthly</span>
                <span className="sm:hidden">Month</span>
              </Button>
              <Button
                variant={selectedReport === 'classwise' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedReport('classwise')}
                className="text-xs sm:text-sm"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Class-wise</span>
                <span className="sm:hidden">Class</span>
              </Button>
              <Button
                variant={selectedReport === 'defaulters' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedReport('defaulters')}
                className="text-xs sm:text-sm"
              >
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Defaulters</span>
                <span className="sm:hidden">Def</span>
              </Button>
              <Button
                variant={selectedReport === 'collection' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedReport('collection')}
                className="text-xs sm:text-sm"
              >
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Trend
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel} className="text-xs sm:text-sm">
                <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Exp</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs sm:text-sm">
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Print</span>
                <span className="sm:hidden">Print</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Report */}
      {selectedReport === 'monthly' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Monthly Collection Report</CardTitle>
                <CardDescription>Detailed fee collection for selected month</CardDescription>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableMonths().map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                <p className="text-lg sm:text-xl font-bold">₹{monthlyReport.total.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs sm:text-sm text-green-600">Collected</p>
                <p className="text-lg sm:text-xl font-bold text-green-700">₹{monthlyReport.paid.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs sm:text-sm text-yellow-600">Pending</p>
                <p className="text-lg sm:text-xl font-bold text-yellow-700">₹{monthlyReport.unpaid.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-600">Collection Rate</p>
                <p className="text-lg sm:text-xl font-bold text-blue-700">{monthlyReport.collectionRate}%</p>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyReport.fees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No fee records for this month
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthlyReport.fees.map(fee => {
                      const student = students.find(s => s.id === fee.studentId);
                      return (
                        <TableRow key={fee.id}>
                          <TableCell className="font-medium">{student?.name || 'Unknown'}</TableCell>
                          <TableCell><Badge variant="outline">{student?.class}</Badge></TableCell>
                          <TableCell>₹{fee.amount.toLocaleString('en-IN')}</TableCell>
                          <TableCell>
                            <Badge variant={fee.status === 'paid' ? 'default' : fee.status === 'overdue' ? 'destructive' : 'secondary'}>
                              {fee.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(fee.dueDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {monthlyReport.fees.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    No fee records for this month
                  </CardContent>
                </Card>
              ) : (
                monthlyReport.fees.map(fee => {
                  const student = students.find(s => s.id === fee.studentId);
                  return (
                    <Card key={fee.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base truncate">{student?.name || 'Unknown'}</h3>
                              <Badge variant="outline" className="mt-1 text-xs">{student?.class}</Badge>
                            </div>
                            <Badge variant={fee.status === 'paid' ? 'default' : fee.status === 'overdue' ? 'destructive' : 'secondary'}>
                              {fee.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="text-lg font-bold">₹{fee.amount.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Due Date</p>
                              <p className="text-sm font-medium">{new Date(fee.dueDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class-wise Report */}
      {selectedReport === 'classwise' && (
        <Card>
          <CardHeader>
            <CardTitle>Class-wise Collection Report</CardTitle>
            <CardDescription>Fee collection summary by class</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Total Fees</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(classWiseReport).map(([className, data]) => (
                    <TableRow key={className}>
                      <TableCell><Badge variant="outline">{className}</Badge></TableCell>
                      <TableCell>{data.students}</TableCell>
                      <TableCell>₹{data.totalFees.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-green-600">₹{data.collected.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-red-600">₹{data.pending.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={parseFloat(data.collectionRate) >= 80 ? 'default' : 'secondary'}>
                          {data.collectionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {Object.entries(classWiseReport).map(([className, data]) => (
                <Card key={className}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-sm font-medium">{className}</Badge>
                        <Badge variant={parseFloat(data.collectionRate) >= 80 ? 'default' : 'secondary'}>
                          {data.collectionRate}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Students</p>
                          <p className="text-sm font-semibold">{data.students}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Fees</p>
                          <p className="text-sm font-semibold">₹{data.totalFees.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600">Collected</p>
                          <p className="text-sm font-semibold text-green-700">₹{data.collected.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-red-600">Pending</p>
                          <p className="text-sm font-semibold text-red-700">₹{data.pending.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Defaulters Report */}
      {selectedReport === 'defaulters' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Defaulters Report
            </CardTitle>
            <CardDescription>Students with unpaid/overdue fees</CardDescription>
          </CardHeader>
          <CardContent>
            {defaultersReport.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No defaulters found 🎉
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Unpaid Fees</TableHead>
                        <TableHead>Total Outstanding</TableHead>
                        <TableHead>Oldest Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {defaultersReport.map(d => (
                        <TableRow key={d.student.id}>
                          <TableCell className="font-medium">{d.student.name}</TableCell>
                          <TableCell><Badge variant="outline">{d.student.class}</Badge></TableCell>
                          <TableCell>{d.unpaidCount}</TableCell>
                          <TableCell className="font-bold text-red-600">
                            ₹{d.totalUnpaid.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>{new Date(d.oldestDue).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {defaultersReport.map(d => (
                    <Card key={d.student.id} className="border-red-200">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base truncate">{d.student.name}</h3>
                              <Badge variant="outline" className="mt-1 text-xs">{d.student.class}</Badge>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-lg font-bold text-red-600">₹{d.totalUnpaid.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Unpaid Fees</p>
                              <p className="text-sm font-semibold">{d.unpaidCount}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Oldest Due</p>
                              <p className="text-sm font-medium">{new Date(d.oldestDue).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Collection Trend */}
      {selectedReport === 'collection' && (
        <Card>
          <CardHeader>
            <CardTitle>Collection Trend (Last 6 Months)</CardTitle>
            <CardDescription>Monthly collection performance</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Total Fees</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Collection Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionTrend.map(t => (
                    <TableRow key={t.month}>
                      <TableCell className="font-medium">{t.month}</TableCell>
                      <TableCell>₹{t.total.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-green-600">₹{t.collected.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={parseFloat(t.rate) >= 80 ? 'default' : parseFloat(t.rate) >= 50 ? 'secondary' : 'destructive'}>
                          {t.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {collectionTrend.map(t => (
                <Card key={t.month}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">{t.month}</h3>
                        <Badge variant={parseFloat(t.rate) >= 80 ? 'default' : parseFloat(t.rate) >= 50 ? 'secondary' : 'destructive'}>
                          {t.rate}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Fees</p>
                          <p className="text-sm font-semibold">₹{t.total.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600">Collected</p>
                          <p className="text-sm font-semibold text-green-700">₹{t.collected.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
