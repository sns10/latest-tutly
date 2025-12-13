import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Trophy, Calendar, BookOpen, CreditCard, Pencil, X, Check, Mail, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
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

  // Calculate statistics
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const totalAttendance = attendance.length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

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
  }).slice(0, 5);

  const avgScore = testsWithResults.length > 0
    ? Math.round(testsWithResults.reduce((sum, r) => sum + r.percentage, 0) / testsWithResults.length)
    : 0;

  const pendingFees = fees.filter(f => f.status === 'unpaid' || f.status === 'overdue');
  const totalPendingAmount = pendingFees.reduce((sum, f) => sum + f.amount, 0);

  const availableDivisions = divisions.filter(d => d.class === editClass);

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
    // Reset division when class changes
    const classDiv = divisions.find(d => d.class === newClass);
    setEditDivisionId(classDiv?.id || '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{student.class} Grade</span>
                  {student.division && (
                    <Badge variant="outline">{student.division.name}</Badge>
                  )}
                  {student.team && (
                    <Badge variant="secondary">{student.team}</Badge>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
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
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tests" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

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

          <TabsContent value="attendance" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Attendance Rate</span>
                      <span className="font-bold">{attendanceRate}%</span>
                    </div>
                    <Progress value={attendanceRate} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-green-50 rounded-lg text-center">
                      <p className="font-bold text-green-600">{presentCount}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg text-center">
                      <p className="font-bold text-red-600">{attendance.filter(a => a.status === 'absent').length}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                  </div>
                  {/* Recent attendance */}
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-2">Recent Records</p>
                    {attendance.slice(0, 5).map((record, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-secondary last:border-0">
                        <span className="text-xs">{format(new Date(record.date), 'MMM d, yyyy')}</span>
                        <Badge 
                          variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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