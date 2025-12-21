import { useState, useMemo } from 'react';
import { Student, StudentAttendance, StudentTestResult, WeeklyTest, StudentFee, Subject, Faculty, Division, ClassName } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Trophy, Calendar, BookOpen, CreditCard, Pencil, X, Check, Mail, UserCheck, Flame, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, getMonth, setMonth, setYear } from 'date-fns';
import { AssignStudentEmailDialog } from './AssignStudentEmailDialog';

interface StudentDetailsDialogProps {
  student: Student;
  attendance: StudentAttendance[];
  testResults: StudentTestResult[];
  tests: WeeklyTest[];
  fees: StudentFee[];
  subjects: Subject[];
  faculty: Faculty[];
  divisions?: Division[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveStudent: (studentId: string) => void;
  onUpdateStudent?: (studentId: string, updates: { name?: string; class?: ClassName; divisionId?: string | null }) => void;
  onStudentDataUpdated?: () => void;
}

const CLASSES: ClassName[] = ['8th', '9th', '10th', '11th', '12th'];

export function StudentDetailsDialog({
  student,
  attendance,
  testResults,
  tests,
  fees,
  subjects,
  faculty,
  divisions = [],
  open,
  onOpenChange,
  onRemoveStudent,
  onUpdateStudent,
  onStudentDataUpdated,
}: StudentDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [editName, setEditName] = useState(student.name);
  const [editClass, setEditClass] = useState<ClassName>(student.class);
  const [editDivisionId, setEditDivisionId] = useState(student.divisionId || '');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Calculate statistics
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const totalAttendance = attendance.length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  // Calculate streaks
  const streakStats = useMemo(() => {
    const presentDates = new Set<string>();
    attendance.forEach(r => {
      if (r.status === 'present') {
        presentDates.add(r.date);
      }
    });

    const dates = Array.from(presentDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let longestStreak = 1;
    let currentRunningStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const date = new Date(dates[i]);
      const prevDate = new Date(dates[i - 1]);
      const diff = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        currentRunningStreak++;
        longestStreak = Math.max(longestStreak, currentRunningStreak);
      } else {
        currentRunningStreak = 1;
      }
    }

    // Calculate current streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sortedDesc = Array.from(presentDates).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    let currentStreak = 0;
    if (sortedDesc.length > 0) {
      const mostRecent = new Date(sortedDesc[0]);
      mostRecent.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        currentStreak = 1;
        for (let i = 1; i < sortedDesc.length; i++) {
          const date = new Date(sortedDesc[i]);
          date.setHours(0, 0, 0, 0);
          
          const prevDate = new Date(sortedDesc[i - 1]);
          prevDate.setHours(0, 0, 0, 0);
          
          const diff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    return { currentStreak, longestStreak };
  }, [attendance]);

  // Subject-wise attendance
  const subjectAttendance = useMemo(() => {
    const bySubject: Record<string, { present: number; total: number }> = {};
    
    attendance.forEach(record => {
      const subjectId = record.subjectId || 'general';
      if (!bySubject[subjectId]) {
        bySubject[subjectId] = { present: 0, total: 0 };
      }
      bySubject[subjectId].total++;
      if (record.status === 'present') {
        bySubject[subjectId].present++;
      }
    });

    return Object.entries(bySubject).map(([subjectId, data]) => {
      const subject = subjects.find(s => s.id === subjectId);
      return {
        subjectId,
        subjectName: subject?.name || 'General',
        ...data,
        rate: data.total > 0 ? (data.present / data.total) * 100 : 0
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [attendance, subjects]);

  // Subject-wise test performance
  const subjectPerformance = useMemo(() => {
    const bySubject: Record<string, { total: number; sum: number; tests: { name: string; percentage: number }[] }> = {};
    
    testResults.forEach(result => {
      const test = tests.find(t => t.id === result.testId);
      if (!test) return;
      
      const subject = test.subject;
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, sum: 0, tests: [] };
      }
      const percentage = (result.marks / (test.maxMarks || 100)) * 100;
      bySubject[subject].total++;
      bySubject[subject].sum += percentage;
      bySubject[subject].tests.push({ name: test.name, percentage });
    });

    return Object.entries(bySubject).map(([subject, data]) => ({
      subject,
      average: data.total > 0 ? data.sum / data.total : 0,
      testCount: data.total,
      trend: data.tests.length >= 2 
        ? data.tests[0].percentage - data.tests[data.tests.length - 1].percentage 
        : 0
    })).sort((a, b) => b.average - a.average);
  }, [testResults, tests]);

  const testsWithResults = testResults.map(result => {
    const test = tests.find(t => t.id === result.testId);
    return {
      ...result,
      testName: test?.name || 'Unknown Test',
      subject: test?.subject || 'Unknown',
      maxMarks: test?.maxMarks || 100,
      date: test?.date,
      percentage: test ? Math.round((result.marks / (test.maxMarks || 100)) * 100) : 0,
    };
  }).slice(0, 10);

  const avgScore = testsWithResults.length > 0
    ? Math.round(testsWithResults.reduce((sum, r) => sum + r.percentage, 0) / testsWithResults.length)
    : 0;

  const pendingFees = fees.filter(f => f.status === 'unpaid' || f.status === 'overdue');
  const totalPendingAmount = pendingFees.reduce((sum, f) => sum + f.amount, 0);

  const availableDivisions = divisions.filter(d => d.class === editClass);

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const filteredAttendance = useMemo(() => {
    if (selectedSubjectFilter === 'all') return attendance;
    return attendance.filter(a => a.subjectId === selectedSubjectFilter);
  }, [attendance, selectedSubjectFilter]);

  const attendanceByDate = useMemo(() => {
    const map: Record<string, string> = {};
    filteredAttendance.forEach(a => {
      if (!map[a.date]) {
        map[a.date] = a.status;
      }
    });
    return map;
  }, [filteredAttendance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      case 'late': return 'bg-yellow-500 text-white';
      case 'excused': return 'bg-blue-500 text-white';
      default: return '';
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 3 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDayOfMonth = startOfMonth(calendarMonth).getDay();

  const handleRemove = () => {
    if (window.confirm(`Are you sure you want to remove ${student.name}?`)) {
      onRemoveStudent(student.id);
      onOpenChange(false);
    }
  };

  const handleStartEdit = () => {
    setEditName(student.name);
    setEditClass(student.class);
    setEditDivisionId(student.divisionId || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(student.name);
    setEditClass(student.class);
    setEditDivisionId(student.divisionId || '');
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    
    onUpdateStudent?.(student.id, {
      name: editName.trim(),
      class: editClass,
      divisionId: editDivisionId || null,
    });
    setIsEditing(false);
  };

  const handleClassChange = (newClass: ClassName) => {
    setEditClass(newClass);
    const classDiv = divisions.find(d => d.class === newClass);
    setEditDivisionId(classDiv?.id || '');
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get unique subjects from attendance
  const attendanceSubjects = useMemo(() => {
    const subjectIds = new Set<string>();
    attendance.forEach(a => {
      if (a.subjectId) subjectIds.add(a.subjectId);
    });
    return subjects.filter(s => subjectIds.has(s.id));
  }, [attendance, subjects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarImage src={student.avatar} alt={student.name} />
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {isEditing ? (
              <div className="flex-1 space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Student name"
                  className="font-bold"
                />
                <div className="flex gap-2">
                  <Select value={editClass} onValueChange={handleClassChange}>
                    <SelectTrigger className="w-24 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {CLASSES.map((cls) => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={editDivisionId || "none"} 
                    onValueChange={(v) => setEditDivisionId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="w-32 bg-white">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">No Division</SelectItem>
                      {availableDivisions.map((div) => (
                        <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-9 w-9">
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-9 w-9">
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">
                    {student.rollNo && <span className="text-muted-foreground mr-1">#{student.rollNo}</span>}
                    {student.name}
                  </p>
                  {onUpdateStudent && (
                    <Button size="icon" variant="ghost" onClick={handleStartEdit} className="h-6 w-6">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{student.class} Grade</span>
                  {student.division && (
                    <Badge variant="outline">{student.division.name}</Badge>
                  )}
                  {student.team && (
                    <Badge variant="secondary">{student.team}</Badge>
                  )}
                  {streakStats.currentStreak > 0 && (
                    <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 border-orange-300">
                      <Flame className="h-3 w-3" />
                      {streakStats.currentStreak} day streak
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            View and edit student details, attendance, test results, and fees
          </DialogDescription>
        </DialogHeader>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-4">
          <Card>
            <CardContent className="p-3 text-center">
              <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold text-primary">{student.totalXp}</div>
              <div className="text-xs text-muted-foreground">Total XP</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{attendanceRate}%</div>
              <div className="text-xs text-muted-foreground">Attendance</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <BookOpen className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{avgScore}%</div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CreditCard className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">₹{totalPendingAmount}</div>
              <div className="text-xs text-muted-foreground">Pending Fees</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{streakStats.currentStreak}</div>
              <div className="text-xs text-muted-foreground">Current Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{streakStats.longestStreak}</div>
              <div className="text-xs text-muted-foreground">Best Streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="attendance" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="mt-3 space-y-4">
            {/* Attendance Calendar */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-sm">Attendance Calendar</CardTitle>
                  {attendanceSubjects.length > 0 && (
                    <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {attendanceSubjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  {/* Month/Year Navigation */}
                  <div className="flex items-center justify-between w-full max-w-[320px] mb-4 gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Select value={getMonth(calendarMonth).toString()} onValueChange={(v) => setCalendarMonth(setMonth(calendarMonth, parseInt(v)))}>
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, index) => (
                            <SelectItem key={month} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={getYear(calendarMonth).toString()} onValueChange={(v) => setCalendarMonth(setYear(calendarMonth, parseInt(v)))}>
                        <SelectTrigger className="w-[70px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(year => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                      disabled={isSameMonth(calendarMonth, new Date())}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 w-full max-w-[280px]">
                    {weekDays.map(day => (
                      <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
                        {day}
                      </div>
                    ))}

                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {calendarDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const status = attendanceByDate[dateStr];
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <div
                          key={dateStr}
                          className={`
                            aspect-square flex items-center justify-center text-xs rounded-full
                            ${status ? getStatusColor(status) : ''}
                            ${isToday && !status ? 'ring-2 ring-primary' : ''}
                            ${!isSameMonth(day, calendarMonth) ? 'text-muted-foreground/50' : ''}
                          `}
                        >
                          {format(day, 'd')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Present</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Absent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>Late</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Excused</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Rate</span>
                      <span className="font-bold">{attendanceRate}%</span>
                    </div>
                    <Progress value={attendanceRate} className="h-2" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-green-50 rounded-lg text-center">
                      <p className="font-bold text-green-600">{presentCount}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg text-center">
                      <p className="font-bold text-red-600">{absentCount}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded-lg text-center">
                      <p className="font-bold text-yellow-600">{lateCount}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg text-center">
                      <p className="font-bold text-purple-600">{totalAttendance}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject-wise Attendance */}
            {subjectAttendance.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Subject-wise Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {subjectAttendance.map((subject) => (
                      <div key={subject.subjectId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{subject.subjectName}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={subject.rate >= 75 ? 'default' : subject.rate >= 60 ? 'secondary' : 'destructive'}>
                              {subject.rate.toFixed(1)}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {subject.present}/{subject.total}
                            </span>
                          </div>
                        </div>
                        <Progress value={subject.rate} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                {testsWithResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No test results yet</p>
                ) : (
                  <div className="space-y-3">
                    {testsWithResults.map((result, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{result.testName}</p>
                          <p className="text-xs text-muted-foreground">{result.subject}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{result.marks}/{result.maxMarks}</p>
                          <Badge 
                            variant={result.percentage >= 80 ? 'default' : result.percentage >= 60 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {result.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-3 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {subjectPerformance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No test results yet</p>
                ) : (
                  <div className="space-y-4">
                    {subjectPerformance.map((subject, index) => (
                      <div key={subject.subject} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{subject.subject}</span>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">Best</Badge>
                            )}
                            {subject.trend > 5 && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                ↑ Improving
                              </Badge>
                            )}
                            {subject.trend < -5 && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                ↓ Declining
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${getGradeColor(subject.average)}`}>
                              {subject.average.toFixed(1)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({subject.testCount} tests)
                            </span>
                          </div>
                        </div>
                        <Progress value={subject.average} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Streak Stats Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Attendance Streaks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-2xl font-bold text-orange-600">{streakStats.currentStreak}</p>
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Trophy className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold text-purple-600">{streakStats.longestStreak}</p>
                    <p className="text-xs text-muted-foreground">Longest Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fee Status</CardTitle>
              </CardHeader>
              <CardContent>
                {fees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No fee records</p>
                ) : (
                  <div className="space-y-2">
                    {fees.map((fee, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{fee.feeType || 'Tuition Fee'}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(fee.dueDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">₹{fee.amount}</p>
                          <Badge 
                            variant={fee.status === 'paid' ? 'default' : fee.status === 'overdue' ? 'destructive' : 'secondary'}
                            className="text-xs capitalize"
                          >
                            {fee.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex flex-wrap justify-between gap-2 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)} className="gap-2">
              <Mail className="h-4 w-4" />
              {student.email ? 'Update Portal Access' : 'Enable Portal Access'}
            </Button>
            {student.email && (
              <Badge variant="secondary" className="gap-1">
                <UserCheck className="h-3 w-3" />
                {student.email}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remove Student
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Email Assignment Dialog */}
      <AssignStudentEmailDialog
        student={student}
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSuccess={() => {
          onStudentDataUpdated?.();
        }}
      />
    </Dialog>
  );
}
