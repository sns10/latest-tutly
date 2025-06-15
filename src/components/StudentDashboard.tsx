
import React, { useState } from 'react';
import { Student, StudentTestResult, WeeklyTest, StudentAttendance, StudentFee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { CalendarDays, TrendingUp, Award, DollarSign, BookOpen, Target } from 'lucide-react';

interface StudentDashboardProps {
  student: Student;
  testResults: StudentTestResult[];
  tests: WeeklyTest[];
  attendance: StudentAttendance[];
  fees: StudentFee[];
  onClose: () => void;
}

export function StudentDashboard({ 
  student, 
  testResults, 
  tests, 
  attendance, 
  fees, 
  onClose 
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'attendance' | 'fees'>('overview');

  // Calculate academic statistics
  const studentResults = testResults.filter(r => r.studentId === student.id);
  const studentTests = studentResults.map(result => {
    const test = tests.find(t => t.id === result.testId);
    return {
      ...result,
      test,
      percentage: test ? (result.marks / test.maxMarks) * 100 : 0
    };
  }).filter(r => r.test);

  const averageScore = studentTests.length > 0 
    ? studentTests.reduce((sum, r) => sum + r.percentage, 0) / studentTests.length 
    : 0;

  const chartData = studentTests.map((result, index) => ({
    test: result.test?.name.substring(0, 10) + '...',
    marks: result.marks,
    percentage: result.percentage,
    maxMarks: result.test?.maxMarks
  }));

  // Attendance statistics
  const totalAttendanceDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

  // Fee statistics
  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidFees = fees.filter(f => f.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
  const unpaidFees = fees.filter(f => f.status === 'unpaid' || f.status === 'overdue');

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Academic Average</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
          <Progress value={averageScore} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</div>
          <Progress value={attendanceRate} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total XP</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{student.totalXp}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Rank: {student.team || 'No team'}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="test" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="percentage" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderAcademic = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{studentTests.length}</div>
            <div className="text-sm text-muted-foreground text-center">Tests Taken</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{averageScore.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground text-center">Average Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">
              {studentTests.filter(t => t.percentage >= 80).length}
            </div>
            <div className="text-sm text-muted-foreground text-center">A+ Grades</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="test" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="marks" fill="#8884d8" />
              <Bar dataKey="maxMarks" fill="#e0e0e0" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {studentTests.map((result) => (
              <div key={result.testId} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">{result.test?.name}</div>
                  <div className="text-sm text-muted-foreground">{result.test?.subject}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{result.marks}/{result.test?.maxMarks}</div>
                  <Badge variant={result.percentage >= 80 ? 'default' : result.percentage >= 60 ? 'secondary' : 'destructive'}>
                    {result.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-green-600">{presentDays}</div>
            <div className="text-sm text-muted-foreground text-center">Present</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-red-600">
              {attendance.filter(a => a.status === 'absent').length}
            </div>
            <div className="text-sm text-muted-foreground text-center">Absent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-yellow-600">
              {attendance.filter(a => a.status === 'late').length}
            </div>
            <div className="text-sm text-muted-foreground text-center">Late</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{attendanceRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground text-center">Rate</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {attendance.slice(0, 10).map((record) => (
              <div key={record.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">{new Date(record.date).toLocaleDateString()}</div>
                  {record.notes && <div className="text-sm text-muted-foreground">{record.notes}</div>}
                </div>
                <Badge variant={
                  record.status === 'present' ? 'default' :
                  record.status === 'late' ? 'secondary' :
                  record.status === 'excused' ? 'outline' : 'destructive'
                }>
                  {record.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFees = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">${totalFees.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground text-center">Total Fees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-green-600">${paidFees.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground text-center">Paid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-red-600">
              ${(totalFees - paidFees).toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground text-center">Outstanding</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fees.map((fee) => (
              <div key={fee.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">{fee.feeType}</div>
                  <div className="text-sm text-muted-foreground">
                    Due: {new Date(fee.dueDate).toLocaleDateString()}
                  </div>
                  {fee.notes && <div className="text-sm text-muted-foreground">{fee.notes}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold">${fee.amount.toFixed(2)}</div>
                  <Badge variant={
                    fee.status === 'paid' ? 'default' :
                    fee.status === 'partial' ? 'secondary' :
                    fee.status === 'overdue' ? 'destructive' : 'outline'
                  }>
                    {fee.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={student.avatar} />
              <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <p className="text-muted-foreground">Class: {student.class} | Team: {student.team || 'None'}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>

        <div className="flex gap-4 mb-6">
          <Button 
            onClick={() => setActiveTab('overview')} 
            variant={activeTab === 'overview' ? 'default' : 'outline'}
          >
            Overview
          </Button>
          <Button 
            onClick={() => setActiveTab('academic')} 
            variant={activeTab === 'academic' ? 'default' : 'outline'}
          >
            Academic
          </Button>
          <Button 
            onClick={() => setActiveTab('attendance')} 
            variant={activeTab === 'attendance' ? 'default' : 'outline'}
          >
            Attendance
          </Button>
          <Button 
            onClick={() => setActiveTab('fees')} 
            variant={activeTab === 'fees' ? 'default' : 'outline'}
          >
            Fees
          </Button>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'academic' && renderAcademic()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'fees' && renderFees()}
      </div>
    </div>
  );
}
