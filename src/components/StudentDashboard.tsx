import React, { useState, useMemo } from 'react';
import { Student, StudentTestResult, WeeklyTest, StudentAttendance, StudentFee, Subject, Faculty } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, TrendingUp, Award } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';

interface StudentDashboardProps {
  student: Student;
  testResults: StudentTestResult[];
  tests: WeeklyTest[];
  attendance: StudentAttendance[];
  fees: StudentFee[];
  subjects: Subject[];
  faculty: Faculty[];
  onClose: () => void;
}

export function StudentDashboard({ 
  student, 
  testResults, 
  tests, 
  attendance, 
  fees,
  subjects,
  faculty,
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

  // Group attendance by subject
  const attendanceBySubject = attendance.reduce((acc, record) => {
    const subjectId = record.subjectId || 'general';
    if (!acc[subjectId]) {
      acc[subjectId] = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      };
    }
    acc[subjectId].total++;
    if (record.status === 'present') acc[subjectId].present++;
    if (record.status === 'absent') acc[subjectId].absent++;
    if (record.status === 'late') acc[subjectId].late++;
    if (record.status === 'excused') acc[subjectId].excused++;
    return acc;
  }, {} as Record<string, { total: number; present: number; absent: number; late: number; excused: number }>);

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
          <CardTitle>Recent Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {studentTests.slice(0, 5).map((result) => (
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
            {studentTests.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No test results yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Group test results by subject
  const testResultsBySubject = useMemo(() => {
    const grouped: Record<string, { tests: typeof studentTests; avgScore: number; total: number }> = {};
    
    studentTests.forEach(result => {
      const subjectName = result.test?.subject || 'Unknown';
      if (!grouped[subjectName]) {
        grouped[subjectName] = { tests: [], avgScore: 0, total: 0 };
      }
      grouped[subjectName].tests.push(result);
      grouped[subjectName].total += result.percentage;
    });
    
    // Calculate average for each subject
    Object.keys(grouped).forEach(subject => {
      grouped[subject].avgScore = grouped[subject].tests.length > 0 
        ? grouped[subject].total / grouped[subject].tests.length 
        : 0;
    });
    
    return grouped;
  }, [studentTests]);

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

      {/* Subject-wise Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.keys(testResultsBySubject).length > 0 ? (
              Object.entries(testResultsBySubject).map(([subject, data]) => (
                <div key={subject} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="font-semibold text-lg">{subject}</div>
                    <Badge variant={data.avgScore >= 80 ? 'default' : data.avgScore >= 60 ? 'secondary' : 'destructive'}>
                      Avg: {data.avgScore.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={data.avgScore} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 text-sm text-center">
                    <div>
                      <div className="font-bold">{data.tests.length}</div>
                      <div className="text-muted-foreground">Tests</div>
                    </div>
                    <div>
                      <div className="font-bold text-green-600">
                        {data.tests.filter(t => t.percentage >= 80).length}
                      </div>
                      <div className="text-muted-foreground">A+ Grades</div>
                    </div>
                    <div>
                      <div className="font-bold text-red-600">
                        {data.tests.filter(t => t.percentage < 60).length}
                      </div>
                      <div className="text-muted-foreground">Below 60%</div>
                    </div>
                  </div>
                  {/* Individual tests for this subject */}
                  <div className="space-y-2 pt-2 border-t">
                    {data.tests.map((result) => (
                      <div key={result.testId} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                        <div>
                          <span className="font-medium">{result.test?.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {result.test?.date ? new Date(result.test.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="font-bold">
                          {result.marks}/{result.test?.maxMarks} ({result.percentage.toFixed(0)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">No test results yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {studentTests.length > 0 ? (
              studentTests.map((result) => (
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
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">No test results yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAttendance = () => {
    const modifiers = {
      present: attendance.filter(a => a.status === 'present').map(a => new Date(a.date)),
      absent: attendance.filter(a => a.status === 'absent').map(a => new Date(a.date)),
      late: attendance.filter(a => a.status === 'late').map(a => new Date(a.date)),
      excused: attendance.filter(a => a.status === 'excused').map(a => new Date(a.date)),
    };

    const modifiersStyles = {
      present: { backgroundColor: '#22c55e', color: 'white', borderRadius: '50%' },
      absent: { backgroundColor: '#ef4444', color: 'white', borderRadius: '50%' },
      late: { backgroundColor: '#eab308', color: 'white', borderRadius: '50%' },
      excused: { backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%' },
    };

    return (
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
            <CardTitle>Attendance Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Calendar
              mode="multiple"
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              month={attendance.length > 0 ? new Date(attendance[0].date) : new Date()}
              className="rounded-md border"
            />
            <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                    <span>Present</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                    <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#eab308]"></div>
                    <span>Late</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                    <span>Excused</span>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(attendanceBySubject).map(([subjectId, stats]) => {
                const subject = subjects.find(s => s.id === subjectId);
                const attendanceRate = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
                return (
                  <div key={subjectId} className="p-3 border rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{subject?.name || 'General'}</div>
                      <Badge variant={attendanceRate >= 75 ? 'default' : attendanceRate >= 60 ? 'secondary' : 'destructive'}>
                        {attendanceRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-green-600 font-bold">{stats.present}</div>
                        <div className="text-xs text-muted-foreground">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600 font-bold">{stats.absent}</div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-600 font-bold">{stats.late}</div>
                        <div className="text-xs text-muted-foreground">Late</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600 font-bold">{stats.excused}</div>
                        <div className="text-xs text-muted-foreground">Excused</div>
                      </div>
                    </div>
                    <Progress value={attendanceRate} className="h-2" />
                  </div>
                );
              })}
              {Object.keys(attendanceBySubject).length === 0 && (
                <div className="text-center text-muted-foreground py-8">No attendance records yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  };

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
