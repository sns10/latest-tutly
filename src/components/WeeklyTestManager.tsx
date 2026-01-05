import { useState, useMemo } from "react";
import { WeeklyTest, StudentTestResult, Student, Challenge, StudentChallenge, Announcement, ClassName, ClassFee, Subject, Faculty, Division, TermExam, TermExamSubject, TermExamResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTestDialog } from "./CreateTestDialog";
import { EnterMarksDialog } from "./EnterMarksDialog";
import { TestResultsView } from "./TestResultsView";

import { AnnouncementsManager } from "./AnnouncementsManager";
import { AttendanceTracker } from "./AttendanceTracker";
import { FeeManagement } from "./FeeManagement";
import { StudentDashboard } from "./StudentDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TestTube2, Users, BarChart3, Monitor, Megaphone, CalendarDays, DollarSign, UserCheck, Trash2, Search, BookOpen } from "lucide-react";
import { ClassFeeManager } from "./ClassFeeManager";
import { TermExamManager } from "./term-exams/TermExamManager";
import { useTuitionFeatures } from "@/hooks/useTuitionFeatures";

interface WeeklyTestManagerProps {
  tests: WeeklyTest[];
  testResults: StudentTestResult[];
  students: Student[];
  challenges: Challenge[];
  studentChallenges: StudentChallenge[];
  announcements: Announcement[];
  attendance?: any[];
  fees?: any[];
  classFees?: ClassFee[];
  subjects: Subject[];
  faculty: Faculty[];
  divisions?: Division[];
  termExams?: TermExam[];
  termExamSubjects?: TermExamSubject[];
  termExamResults?: TermExamResult[];
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
  onDeleteTest: (testId: string) => void;
  onAddTestResult: (result: StudentTestResult) => void;
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
  onAddChallenge: (challenge: Omit<Challenge, 'id' | 'createdAt'>) => void;
  onCompleteChallenge: (studentId: string, challengeId: string) => void;
  onAddAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => void;
  onMarkAttendance?: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string) => void;
  onAddFee?: (fee: any) => void;
  onUpdateFeeStatus?: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
  onUpdateClassFee?: (className: string, amount: number) => void;
  onCreateTermExam?: (exam: any) => Promise<string | null>;
  onDeleteTermExam?: (examId: string) => void;
  onAddTermExamResult?: (result: any) => void;
  onBulkAddTermExamResults?: (results: any[]) => Promise<boolean>;
  showAttendanceTab?: boolean;
  showFeesTab?: boolean;
}

export function WeeklyTestManager({ 
  tests, 
  testResults, 
  students, 
  challenges,
  studentChallenges,
  announcements,
  attendance = [],
  fees = [],
  classFees = [],
  subjects,
  faculty,
  divisions = [],
  termExams = [],
  termExamSubjects = [],
  termExamResults = [],
  onAddTest,
  onDeleteTest,
  onAddTestResult,
  onAwardXP,
  onAddChallenge,
  onCompleteChallenge,
  onAddAnnouncement,
  onMarkAttendance,
  onAddFee,
  onUpdateFeeStatus,
  onUpdateClassFee,
  onCreateTermExam,
  onDeleteTermExam,
  onAddTermExamResult,
  onBulkAddTermExamResults,
  showAttendanceTab = false,
  showFeesTab = false,
}: WeeklyTestManagerProps) {
  const { isFeatureEnabled } = useTuitionFeatures();
  const [selectedTest, setSelectedTest] = useState<WeeklyTest | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesClass = studentClassFilter === 'all' || student.class === studentClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, studentSearch, studentClassFilter]);

  const getTestStats = (test: WeeklyTest) => {
    // Filter students by test class
    const eligibleStudents = test.class === "All" 
      ? students 
      : students.filter(s => s.class === test.class);
    
    const results = testResults.filter(r => r.testId === test.id);
    const totalStudents = eligibleStudents.length;
    const studentsCompleted = results.length;
    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.marks / test.maxMarks) * 100, 0) / results.length 
      : 0;

    return {
      completed: studentsCompleted,
      total: totalStudents,
      average: Math.round(averageScore)
    };
  };

  const handleDeleteTest = (testId: string) => {
    onDeleteTest(testId);
  };

  if (selectedTest) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedTest(null)}>
          ← Back to Tests
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{selectedTest.name}</span>
              <Badge variant="outline">{selectedTest.subject}</Badge>
              <Badge variant="secondary">{selectedTest.class === "All" ? "All Classes" : `${selectedTest.class} Grade`}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TestResultsView 
              tests={[selectedTest]} 
              testResults={testResults.filter(r => r.testId === selectedTest.id)} 
              students={selectedTest.class === "All" ? students : students.filter(s => s.class === selectedTest.class)} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <StudentDashboard
        student={selectedStudent}
        testResults={testResults}
        tests={tests}
        attendance={attendance.filter(a => a.studentId === selectedStudent.id)}
        fees={fees.filter(f => f.studentId === selectedStudent.id)}
        subjects={subjects}
        faculty={faculty}
        onClose={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">School Management</h2>
          <p className="text-muted-foreground">Manage tests, challenges, announcements and track progress</p>
        </div>
        <CreateTestDialog onAddTest={onAddTest} subjects={subjects} />
      </div>

      <Tabs defaultValue="tests" className="w-full">
        <div className="w-full overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-max">
            <TabsTrigger value="tests" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <TestTube2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Tests</span>
            </TabsTrigger>
            <TabsTrigger value="marks" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Marks</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Students</span>
            </TabsTrigger>
            {showAttendanceTab && isFeatureEnabled('attendance') && (
              <TabsTrigger value="attendance" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Attend</span>
              </TabsTrigger>
            )}
            {showFeesTab && isFeatureEnabled('fees') && (
              <TabsTrigger value="fees" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Fees</span>
              </TabsTrigger>
            )}
            {isFeatureEnabled('announcements') && (
              <TabsTrigger value="announcements" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Announce</span>
              </TabsTrigger>
            )}
            {isFeatureEnabled('term_exams') && (
              <TabsTrigger value="term-exams" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Term Exams</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="tests" className="space-y-4">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TestTube2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests created yet</h3>
                <p className="text-muted-foreground mb-4">Create your first weekly test to get started</p>
                <CreateTestDialog onAddTest={onAddTest} subjects={subjects} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tests.map((test) => {
                const stats = getTestStats(test);
                return (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">{test.name}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{test.subject}</Badge>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                              {test.class === "All" ? "All Classes" : `${test.class} Grade`}
                            </Badge>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(test.date).toLocaleDateString()}
                            </span>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              Max: {test.maxMarks} marks
                            </span>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 shrink-0">
                          <div className="text-xl sm:text-2xl font-bold text-primary">
                            {stats.completed}/{stats.total}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">completed</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="text-xs sm:text-sm">
                            <span className="font-semibold">Avg Score: </span>
                            <span className={`font-bold ${stats.average >= 80 ? 'text-green-500' : stats.average >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {stats.average}%
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <EnterMarksDialog 
                            test={test} 
                            students={students}
                            existingResults={testResults.filter(r => r.testId === test.id)}
                            divisions={divisions}
                            onAddResult={onAddTestResult}
                            onAwardXP={onAwardXP}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedTest(test)}
                            className="text-xs sm:text-sm"
                          >
                            View Results
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base sm:text-lg">Delete Test</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm">
                                  Are you sure you want to delete "{test.name}"? This will also delete all associated test results. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="m-0">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTest(test.id)}
                                  className="bg-red-600 hover:bg-red-700 m-0"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marks">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Create a test first to enter marks</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tests.map((test) => (
                <Card key={test.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span>{test.name}</span>
                        <Badge variant="outline" className="bg-blue-50">
                          {test.class === "All" ? "All Classes" : `${test.class} Grade`}
                        </Badge>
                      </div>
                      <EnterMarksDialog 
                        test={test} 
                        students={students}
                        existingResults={testResults.filter(r => r.testId === test.id)}
                        divisions={divisions}
                        onAddResult={onAddTestResult}
                        onAwardXP={onAwardXP}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Dashboard</CardTitle>
              <p className="text-muted-foreground">Click on a student to view their detailed information</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={studentClassFilter} onValueChange={setStudentClassFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="4th">4th</SelectItem>
                    <SelectItem value="5th">5th</SelectItem>
                    <SelectItem value="6th">6th</SelectItem>
                    <SelectItem value="7th">7th</SelectItem>
                    <SelectItem value="8th">8th</SelectItem>
                    <SelectItem value="9th">9th</SelectItem>
                    <SelectItem value="10th">10th</SelectItem>
                    <SelectItem value="11th">11th</SelectItem>
                    <SelectItem value="12th">12th</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <Card key={student.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStudent(student)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Class: {student.class} | XP: {student.totalXp}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground col-span-full text-center py-4">No students found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showAttendanceTab && onMarkAttendance && isFeatureEnabled('attendance') && (
          <TabsContent value="attendance">
            <AttendanceTracker 
              students={students}
              attendance={attendance}
              onMarkAttendance={onMarkAttendance}
            />
          </TabsContent>
        )}

        {showFeesTab && onAddFee && onUpdateFeeStatus && onUpdateClassFee && isFeatureEnabled('fees') && (
          <TabsContent value="fees" className="space-y-6">
            <ClassFeeManager 
              classFees={classFees}
              onUpdateClassFee={onUpdateClassFee}
            />
            <FeeManagement 
              students={students}
              fees={fees}
              classFees={classFees}
              onAddFee={onAddFee}
              onUpdateFeeStatus={onUpdateFeeStatus}
            />
          </TabsContent>
        )}


        {isFeatureEnabled('announcements') && (
          <TabsContent value="announcements">
            <AnnouncementsManager 
              announcements={announcements}
              onAddAnnouncement={onAddAnnouncement}
            />
          </TabsContent>
        )}

        <TabsContent value="reports">
          <TestResultsView 
            tests={tests}
            testResults={testResults}
            students={students}
          />
        </TabsContent>

        <TabsContent value="term-exams">
          {onCreateTermExam && onDeleteTermExam && onAddTermExamResult && onBulkAddTermExamResults && (
            <TermExamManager
              termExams={termExams}
              termExamSubjects={termExamSubjects}
              termExamResults={termExamResults}
              students={students}
              subjects={subjects}
              divisions={divisions}
              onCreateExam={onCreateTermExam}
              onDeleteExam={onDeleteTermExam}
              onAddResult={onAddTermExamResult}
              onBulkAddResults={onBulkAddTermExamResults}
            />
          )}
        </TabsContent>
      </Tabs>

      {selectedTest && (
        <TestResultsView 
          tests={[selectedTest]}
          testResults={testResults.filter(r => r.testId === selectedTest.id)}
          students={students}
        />
      )}
    </div>
  );
}
