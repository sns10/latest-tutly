import { useState, useMemo } from 'react';
import { Student, StudentAttendance, StudentTestResult, WeeklyTest, StudentFee, Subject, Faculty, Division, ClassName, TermExam, TermExamSubject, TermExamResult } from '@/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Trophy, Calendar, BookOpen, CreditCard, Pencil, X, Check, Mail, UserCheck, Flame, TrendingUp, ChevronLeft, ChevronRight, History, Banknote, Smartphone, Building, ChevronDown, ChevronUp, User, Phone, MapPin, Cake } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, getMonth, setMonth, setYear } from 'date-fns';
import { AssignStudentEmailDialog } from './AssignStudentEmailDialog';

interface FeePayment {
  id: string;
  fee_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

interface StudentDetailsDialogProps {
  student: Student;
  attendance: StudentAttendance[];
  testResults: StudentTestResult[];
  tests: WeeklyTest[];
  fees: StudentFee[];
  feePayments?: FeePayment[];
  subjects: Subject[];
  faculty: Faculty[];
  divisions?: Division[];
  termExams?: TermExam[];
  termExamSubjects?: TermExamSubject[];
  termExamResults?: TermExamResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveStudent: (studentId: string) => void;
  onUpdateStudent?: (studentId: string, updates: { 
    name?: string; 
    class?: ClassName; 
    divisionId?: string | null;
    email?: string | null;
    phone?: string | null;
    rollNo?: number | null;
    dateOfBirth?: string | null;
    parentName?: string | null;
    parentPhone?: string | null;
    address?: string | null;
    gender?: 'male' | 'female' | 'other' | null;
  }) => void;
  onStudentDataUpdated?: () => void;
}

const CLASSES: ClassName[] = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

export function StudentDetailsDialog({
  student,
  attendance,
  testResults,
  tests,
  fees,
  feePayments = [],
  subjects,
  faculty,
  divisions = [],
  termExams = [],
  termExamSubjects = [],
  termExamResults = [],
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
  const [editRollNo, setEditRollNo] = useState<number | undefined>(student.rollNo);
  const [editEmail, setEditEmail] = useState(student.email || '');
  const [editPhone, setEditPhone] = useState(student.phone || '');
  const [editDateOfBirth, setEditDateOfBirth] = useState(student.dateOfBirth || '');
  const [editParentName, setEditParentName] = useState(student.parentName || '');
  const [editParentPhone, setEditParentPhone] = useState(student.parentPhone || '');
  const [editAddress, setEditAddress] = useState(student.address || '');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other' | ''>(student.gender || '');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);

  // Get payment method display info
  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-3 w-3" />;
      case 'upi':
        return <Smartphone className="h-3 w-3" />;
      case 'bank_transfer':
        return <Building className="h-3 w-3" />;
      default:
        return <CreditCard className="h-3 w-3" />;
    }
  };

  const formatPaymentMethod = (method: string | null) => {
    const methods: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      card: 'Card',
    };
    return method ? methods[method] || method : 'Unknown';
  };

  // Get payments for a specific fee
  const getPaymentsForFee = (feeId: string) => {
    return feePayments.filter(p => p.fee_id === feeId).sort((a, b) =>
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );
  };

  // Calculate total paid for a fee
  const getTotalPaidForFee = (feeId: string) => {
    return feePayments
      .filter(p => p.fee_id === feeId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

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

  // Calculate average score including both weekly tests and term exams
  const allTestPercentages = testResults.map(result => {
    const test = tests.find(t => t.id === result.testId);
    return test ? (result.marks / (test.maxMarks || 100)) * 100 : 0;
  });

  // Add term exam subject percentages
  termExamResults.forEach(result => {
    const examSubject = termExamSubjects.find(s =>
      s.termExamId === result.termExamId &&
      s.subjectId === result.subjectId
    );
    if (examSubject && result.marks !== null && result.marks !== undefined) {
      const percentage = (result.marks / examSubject.maxMarks) * 100;
      allTestPercentages.push(percentage);
    }
  });

  const avgScore = allTestPercentages.length > 0
    ? Math.round(allTestPercentages.reduce((sum, p) => sum + p, 0) / allTestPercentages.length)
    : 0;

  // Process term exam data
  const termExamData = useMemo(() => {
    const studentTermExams = termExams.filter(exam => exam.class === student.class);

    return studentTermExams.map(exam => {
      const examSubjects = termExamSubjects.filter(s => s.termExamId === exam.id);
      const results = termExamResults.filter(r => r.termExamId === exam.id);

      let totalMarks = 0;
      let totalMaxMarks = 0;

      const subjectResults = examSubjects.map(es => {
        const result = results.find(r => r.subjectId === es.subjectId);
        if (result?.marks !== null && result?.marks !== undefined) {
          totalMarks += result.marks;
          totalMaxMarks += es.maxMarks;
        }
        return {
          subjectId: es.subjectId,
          subjectName: es.subject?.name || 'Unknown',
          marks: result?.marks,
          maxMarks: es.maxMarks,
          grade: result?.grade
        };
      });

      const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

      const getGrade = (pct: number): string => {
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B+';
        if (pct >= 60) return 'B';
        if (pct >= 50) return 'C+';
        if (pct >= 40) return 'C';
        if (pct >= 35) return 'D';
        return 'F';
      };

      return {
        ...exam,
        subjectResults,
        totalMarks,
        totalMaxMarks,
        percentage,
        grade: getGrade(percentage)
      };
    });
  }, [termExams, termExamSubjects, termExamResults, student.class]);

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
    setEditRollNo(student.rollNo);
    setEditEmail(student.email || '');
    setEditPhone(student.phone || '');
    setEditDateOfBirth(student.dateOfBirth || '');
    setEditParentName(student.parentName || '');
    setEditParentPhone(student.parentPhone || '');
    setEditAddress(student.address || '');
    setEditGender(student.gender || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(student.name);
    setEditClass(student.class);
    setEditDivisionId(student.divisionId || '');
    setEditRollNo(student.rollNo);
    setEditEmail(student.email || '');
    setEditPhone(student.phone || '');
    setEditDateOfBirth(student.dateOfBirth || '');
    setEditParentName(student.parentName || '');
    setEditParentPhone(student.parentPhone || '');
    setEditAddress(student.address || '');
    setEditGender(student.gender || '');
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;

    onUpdateStudent?.(student.id, {
      name: editName.trim(),
      class: editClass,
      divisionId: editDivisionId || null,
      rollNo: editRollNo || null,
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      dateOfBirth: editDateOfBirth || null,
      parentName: editParentName.trim() || null,
      parentPhone: editParentPhone.trim() || null,
      address: editAddress.trim() || null,
      gender: editGender || null,
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">
                  {student.rollNo && <span className="text-muted-foreground mr-1">#{student.rollNo}</span>}
                  {student.name}
                </p>
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
        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Student Information
                  </CardTitle>
                  {onUpdateStudent && !isEditing && (
                    <Button size="sm" variant="outline" onClick={handleStartEdit} className="h-7 gap-1">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Student name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Roll Number</label>
                        <Input
                          type="number"
                          value={editRollNo || ''}
                          onChange={(e) => setEditRollNo(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Roll number"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Class</label>
                        <Select value={editClass} onValueChange={handleClassChange}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {CLASSES.map((cls) => (
                              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Division</label>
                        <Select
                          value={editDivisionId || "none"}
                          onValueChange={(v) => setEditDivisionId(v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Division" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="none">No Division</SelectItem>
                            {availableDivisions.map((div) => (
                              <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Gender</label>
                        <Select
                          value={editGender || "none"}
                          onValueChange={(v) => setEditGender(v === "none" ? "" : v as 'male' | 'female' | 'other')}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="none">Not specified</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                        <Input
                          type="date"
                          value={editDateOfBirth}
                          onChange={(e) => setEditDateOfBirth(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Contact Information</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Email</label>
                          <Input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="student@email.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Phone</label>
                          <Input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Parent Info */}
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Parent/Guardian Information</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Parent Name</label>
                          <Input
                            value={editParentName}
                            onChange={(e) => setEditParentName(e.target.value)}
                            placeholder="Parent/Guardian name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Parent Phone</label>
                          <Input
                            type="tel"
                            value={editParentPhone}
                            onChange={(e) => setEditParentPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="pt-2 border-t">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Address</label>
                        <Textarea
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="Full address"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Basic Info Display */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Roll No</p>
                        <p className="text-sm font-medium">{student.rollNo || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Class</p>
                        <p className="text-sm font-medium">{student.class}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Division</p>
                        <p className="text-sm font-medium">{student.division?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gender</p>
                        <p className="text-sm font-medium capitalize">{student.gender || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Cake className="h-3 w-3" /> Date of Birth
                        </p>
                        <p className="text-sm font-medium">
                          {student.dateOfBirth 
                            ? format(new Date(student.dateOfBirth), 'dd MMM yyyy')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Team</p>
                        <p className="text-sm font-medium">{student.team || '-'}</p>
                      </div>
                    </div>

                    {/* Contact Info Display */}
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Contact Information
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium">{student.email || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm font-medium">{student.phone || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Parent Info Display */}
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Parent/Guardian</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="text-sm font-medium">{student.parentName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm font-medium">{student.parentPhone || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address Display */}
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Address
                      </p>
                      <p className="text-sm">{student.address || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
          <TabsContent value="tests" className="mt-3 space-y-4">
            {/* Weekly Tests */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Weekly Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                {testsWithResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No weekly test results yet</p>
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

            {/* Term Exams */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Term Exam Results</CardTitle>
              </CardHeader>
              <CardContent>
                {termExamData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No term exam results yet</p>
                ) : (
                  <div className="space-y-4">
                    {termExamData.map((exam) => (
                      <div key={exam.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm">{exam.name}</div>
                            <div className="text-xs text-muted-foreground">{exam.term} • {exam.academicYear}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm">{exam.totalMarks}/{exam.totalMaxMarks}</div>
                            <Badge
                              variant={exam.percentage >= 80 ? 'default' : exam.percentage >= 60 ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {exam.percentage.toFixed(1)}% • {exam.grade}
                            </Badge>
                          </div>
                        </div>

                        {/* Subject-wise breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2 pt-2 border-t">
                          {exam.subjectResults.map((sr) => (
                            <div key={sr.subjectId} className="bg-muted/50 rounded px-2 py-1">
                              <div className="text-xs text-muted-foreground truncate">{sr.subjectName}</div>
                              <div className="font-medium text-sm">
                                {sr.marks !== null && sr.marks !== undefined ? (
                                  <span>{sr.marks}/{sr.maxMarks}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </div>
                          ))}
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
          <TabsContent value="fees" className="mt-3 space-y-4">
            {/* Fee Summary */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-primary">₹{fees.reduce((sum, f) => sum + f.amount, 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">Total Fees</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-green-600">₹{feePayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-yellow-600">
                    ₹{(fees.reduce((sum, f) => sum + f.amount, 0) - feePayments.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Fee Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No fee records</p>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {fees.map((fee) => {
                        const payments = getPaymentsForFee(fee.id);
                        const totalPaid = getTotalPaidForFee(fee.id);
                        const remaining = fee.amount - totalPaid;
                        const isExpanded = expandedFeeId === fee.id;

                        return (
                          <div key={fee.id} className="border rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-3 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                              onClick={() => setExpandedFeeId(isExpanded ? null : fee.id)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{fee.feeType || 'Tuition Fee'}</p>
                                  {payments.length > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <History className="h-3 w-3" />
                                      {payments.length} payment{payments.length > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Due: {format(new Date(fee.dueDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <div>
                                  <p className="font-bold text-sm">₹{fee.amount.toLocaleString('en-IN')}</p>
                                  {totalPaid > 0 && totalPaid < fee.amount && (
                                    <p className="text-xs text-green-600">Paid: ₹{totalPaid.toLocaleString('en-IN')}</p>
                                  )}
                                  <Badge
                                    variant={fee.status === 'paid' ? 'default' : fee.status === 'overdue' ? 'destructive' : 'secondary'}
                                    className="text-xs capitalize"
                                  >
                                    {fee.status === 'partial' ? `Partial (₹${remaining.toLocaleString('en-IN')} left)` : fee.status}
                                  </Badge>
                                </div>
                                {payments.length > 0 && (
                                  isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Payment History */}
                            {isExpanded && payments.length > 0 && (
                              <div className="border-t bg-muted/30 p-2">
                                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Payment History</p>
                                <div className="space-y-1.5">
                                  {payments.map((payment, idx) => (
                                    <div key={payment.id} className="flex items-center justify-between p-2 bg-background rounded text-sm">
                                      <div className="flex items-center gap-2">
                                        {getPaymentMethodIcon(payment.payment_method)}
                                        <div>
                                          <p className="font-medium text-green-600">+₹{payment.amount.toLocaleString('en-IN')}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(payment.payment_date), 'MMM d, yyyy')} • {formatPaymentMethod(payment.payment_method)}
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs">#{payments.length - idx}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
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
