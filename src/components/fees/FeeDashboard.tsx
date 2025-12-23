import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Student, StudentFee, ClassFee } from '@/types';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface FeeDashboardProps {
  students: Student[];
  fees: StudentFee[];
  classFees: ClassFee[];
}

export function FeeDashboard({ students, fees, classFees }: FeeDashboardProps) {
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const stats = useMemo(() => {
    const currentMonthFees = fees.filter(f => 
      f.feeType?.includes(currentMonth) || f.dueDate?.startsWith(currentMonth)
    );
    
    const totalAmount = currentMonthFees.reduce((sum, f) => sum + f.amount, 0);
    const paidAmount = currentMonthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const unpaidAmount = currentMonthFees.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
    const overdueAmount = currentMonthFees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0);
    const partialAmount = currentMonthFees.filter(f => f.status === 'partial').reduce((sum, f) => sum + f.amount, 0);
    
    const paidCount = currentMonthFees.filter(f => f.status === 'paid').length;
    const unpaidCount = currentMonthFees.filter(f => f.status === 'unpaid').length;
    const overdueCount = currentMonthFees.filter(f => f.status === 'overdue').length;
    
    const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    
    // Last month comparison
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthFees = fees.filter(f => 
      f.feeType?.includes(lastMonthStr) || f.dueDate?.startsWith(lastMonthStr)
    );
    const lastMonthPaid = lastMonthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const lastMonthTotal = lastMonthFees.reduce((sum, f) => sum + f.amount, 0);
    const lastMonthRate = lastMonthTotal > 0 ? (lastMonthPaid / lastMonthTotal) * 100 : 0;
    const rateChange = collectionRate - lastMonthRate;

    return {
      totalAmount,
      paidAmount,
      unpaidAmount,
      overdueAmount,
      partialAmount,
      paidCount,
      unpaidCount,
      overdueCount,
      collectionRate,
      rateChange,
      totalStudents: students.length
    };
  }, [fees, students, currentMonth]);

  // Monthly trend data (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthFees = fees.filter(f => 
        f.feeType?.includes(monthStr) || f.dueDate?.startsWith(monthStr)
      );
      
      const total = monthFees.reduce((sum, f) => sum + f.amount, 0);
      const paid = monthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
      
      months.push({
        month: monthName,
        total: total / 1000,
        collected: paid / 1000
      });
    }
    return months;
  }, [fees]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: 'Paid', value: stats.paidAmount, color: 'hsl(var(--chart-1))' },
    { name: 'Unpaid', value: stats.unpaidAmount, color: 'hsl(var(--chart-2))' },
    { name: 'Overdue', value: stats.overdueAmount, color: 'hsl(var(--chart-3))' },
    { name: 'Partial', value: stats.partialAmount, color: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0), [stats]);

  // Class-wise collection
  const classWiseData = useMemo(() => {
    const classData: Record<string, { total: number; collected: number }> = {};
    
    fees.filter(f => f.feeType?.includes(currentMonth) || f.dueDate?.startsWith(currentMonth))
      .forEach(fee => {
        const student = students.find(s => s.id === fee.studentId);
        if (student) {
          if (!classData[student.class]) {
            classData[student.class] = { total: 0, collected: 0 };
          }
          classData[student.class].total += fee.amount;
          if (fee.status === 'paid') {
            classData[student.class].collected += fee.amount;
          }
        }
      });

    return Object.entries(classData)
      .map(([className, data]) => ({
        class: className,
        total: data.total / 1000,
        collected: data.collected / 1000,
        rate: data.total > 0 ? Math.round((data.collected / data.total) * 100) : 0
      }))
      .sort((a, b) => a.class.localeCompare(b.class));
  }, [fees, students, currentMonth]);

  // Top defaulters
  const topDefaulters = useMemo(() => {
    const defaulterMap: Record<string, { student: Student; unpaidAmount: number; unpaidCount: number }> = {};
    
    fees.filter(f => f.status === 'unpaid' || f.status === 'overdue')
      .forEach(fee => {
        const student = students.find(s => s.id === fee.studentId);
        if (student) {
          if (!defaulterMap[student.id]) {
            defaulterMap[student.id] = { student, unpaidAmount: 0, unpaidCount: 0 };
          }
          defaulterMap[student.id].unpaidAmount += fee.amount;
          defaulterMap[student.id].unpaidCount += 1;
        }
      });

    return Object.values(defaulterMap)
      .sort((a, b) => b.unpaidAmount - a.unpaidAmount)
      .slice(0, 5);
  }, [fees, students]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Expected</p>
                <p className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Collected</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">{formatCurrency(stats.unpaidAmount)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Overdue</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Rate & Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl sm:text-3xl font-bold">{stats.collectionRate.toFixed(1)}%</span>
                <Badge variant={stats.rateChange >= 0 ? "default" : "destructive"} className="flex items-center gap-1">
                  {stats.rateChange >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(stats.rateChange).toFixed(1)}% vs last month
                </Badge>
              </div>
              <Progress value={stats.collectionRate} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.paidCount} paid</span>
                <span>{stats.unpaidCount} pending</span>
                <span>{stats.overdueCount} overdue</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Students</span>
                <span className="font-semibold">{stats.totalStudents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fees Generated</span>
                <span className="font-semibold">{stats.paidCount + stats.unpaidCount + stats.overdueCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fully Paid</span>
                <span className="font-semibold text-green-600">{stats.paidCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Defaulters</span>
                <span className="font-semibold text-red-600">{stats.overdueCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Collection Trend</CardTitle>
            <CardDescription>Last 6 months (in thousands)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toFixed(1)}K`, '']}
                    contentStyle={{ 
                      background: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--muted))" name="Expected" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" fill="hsl(var(--primary))" name="Collected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Status Distribution</CardTitle>
            <CardDescription>Current month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), '']}
                    contentStyle={{ 
                      background: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class-wise & Defaulters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Class-wise Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Class-wise Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classWiseData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No fee data available</p>
              ) : (
                classWiseData.map((item) => (
                  <div key={item.class} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.class}</span>
                      <span className="text-muted-foreground">
                        ₹{item.collected.toFixed(1)}K / ₹{item.total.toFixed(1)}K ({item.rate}%)
                      </span>
                    </div>
                    <Progress value={item.rate} className="h-2" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Defaulters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Top Defaulters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDefaulters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No defaulters 🎉</p>
              ) : (
                topDefaulters.map((item, index) => (
                  <div key={item.student.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{index + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{item.student.name}</p>
                        <p className="text-xs text-muted-foreground">{item.student.class} • {item.unpaidCount} unpaid</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600">{formatCurrency(item.unpaidAmount)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
