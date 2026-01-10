import { useState } from "react";
import { WeeklyTest, StudentTestResult, Student, Challenge, StudentChallenge, Announcement, ClassFee, Subject, Faculty, Division, TermExam, TermExamSubject, TermExamResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTestDialog } from "./CreateTestDialog";
import { EnterMarksDialog } from "./EnterMarksDialog";
import { TestResultsView } from "./TestResultsView";
import { AttendanceTracker } from "./AttendanceTracker";
import { FeeManagement } from "./FeeManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TestTube2, Users, CalendarDays, DollarSign, Trash2, BookOpen } from "lucide-react";
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
  tuitionName?: string;
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
  onDeleteTest: (testId: string) => void;
  onAddTestResult: (result: StudentTestResult) => Promise<boolean>;
  onAddTestResultsBatch?: (results: StudentTestResult[]) => Promise<boolean>;
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
  tuitionName,
  onAddTest,
  onDeleteTest,
  onAddTestResult,
  onAddTestResultsBatch,
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
            {(isFeatureEnabled('term_exams') || (onCreateTermExam && onDeleteTermExam && onAddTermExamResult && onBulkAddTermExamResults)) && (
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
                            onAddResultsBatch={onAddTestResultsBatch}
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
                        onAddResultsBatch={onAddTestResultsBatch}
                        onAwardXP={onAwardXP}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
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


        <TabsContent value="reports">
          <TestResultsView 
            tests={tests}
            testResults={testResults}
            students={students}
          />
        </TabsContent>

        {(isFeatureEnabled('term_exams') || (onCreateTermExam && onDeleteTermExam && onAddTermExamResult && onBulkAddTermExamResults)) && (
          <TabsContent value="term-exams">
            {onCreateTermExam && onDeleteTermExam && onAddTermExamResult && onBulkAddTermExamResults ? (
              <TermExamManager
                termExams={termExams}
                termExamSubjects={termExamSubjects}
                termExamResults={termExamResults}
                students={students}
                subjects={subjects}
                divisions={divisions}
                tuitionName={tuitionName}
                onCreateExam={onCreateTermExam}
                onDeleteExam={onDeleteTermExam}
                onAddResult={onAddTermExamResult}
                onBulkAddResults={onBulkAddTermExamResults}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Term Exams Not Available</h3>
                  <p className="text-muted-foreground">
                    Term exams feature is not configured for this view.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
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
