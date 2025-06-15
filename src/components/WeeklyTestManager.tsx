
import { useState } from "react";
import { WeeklyTest, StudentTestResult, Student, Challenge, StudentChallenge, Announcement } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTestDialog } from "./CreateTestDialog";
import { EnterMarksDialog } from "./EnterMarksDialog";
import { TestResultsView } from "./TestResultsView";
import { SmartboardView } from "./SmartboardView";
import { ChallengesManager } from "./ChallengesManager";
import { AnnouncementsManager } from "./AnnouncementsManager";
import { AttendanceTracker } from "./AttendanceTracker";
import { FeeManagement } from "./FeeManagement";
import { StudentDashboard } from "./StudentDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TestTube2, Users, BarChart3, Monitor, Trophy, Megaphone, CalendarDays, DollarSign, UserCheck, Trash2 } from "lucide-react";

interface WeeklyTestManagerProps {
  tests: WeeklyTest[];
  testResults: StudentTestResult[];
  students: Student[];
  challenges: Challenge[];
  studentChallenges: StudentChallenge[];
  announcements: Announcement[];
  attendance: any[];
  fees: any[];
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
  onDeleteTest: (testId: string) => void;
  onAddTestResult: (result: StudentTestResult) => void;
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
  onAddChallenge: (challenge: Omit<Challenge, 'id' | 'createdAt'>) => void;
  onCompleteChallenge: (studentId: string, challengeId: string) => void;
  onAddAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => void;
  onMarkAttendance: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string) => void;
  onAddFee: (fee: any) => void;
  onUpdateFeeStatus: (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => void;
}

export function WeeklyTestManager({ 
  tests, 
  testResults, 
  students, 
  challenges,
  studentChallenges,
  announcements,
  attendance,
  fees,
  onAddTest,
  onDeleteTest,
  onAddTestResult,
  onAwardXP,
  onAddChallenge,
  onCompleteChallenge,
  onAddAnnouncement,
  onMarkAttendance,
  onAddFee,
  onUpdateFeeStatus
}: WeeklyTestManagerProps) {
  const [selectedTest, setSelectedTest] = useState<WeeklyTest | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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

  if (selectedStudent) {
    return (
      <StudentDashboard
        student={selectedStudent}
        testResults={testResults}
        tests={tests}
        attendance={attendance.filter(a => a.studentId === selectedStudent.id)}
        fees={fees.filter(f => f.studentId === selectedStudent.id)}
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
        <CreateTestDialog onAddTest={onAddTest} />
      </div>

      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <TestTube2 className="h-4 w-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="marks" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Enter Marks
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Fees
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TestTube2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests created yet</h3>
                <p className="text-muted-foreground mb-4">Create your first weekly test to get started</p>
                <CreateTestDialog onAddTest={onAddTest} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tests.map((test) => {
                const stats = getTestStats(test);
                return (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{test.name}</CardTitle>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">{test.subject}</Badge>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {test.class === "All" ? "All Classes" : `${test.class} Grade`}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(test.date).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Max: {test.maxMarks} marks
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {stats.completed}/{stats.total}
                          </div>
                          <div className="text-sm text-muted-foreground">completed</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="font-semibold">Avg Score: </span>
                            <span className={`font-bold ${stats.average >= 80 ? 'text-green-500' : stats.average >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {stats.average}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <EnterMarksDialog 
                            test={test} 
                            students={students}
                            existingResults={testResults.filter(r => r.testId === test.id)}
                            onAddResult={onAddTestResult}
                            onAwardXP={onAwardXP}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedTest(test)}
                          >
                            View Results
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Test</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{test.name}"? This will also delete all associated test results. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTest(test.id)}
                                  className="bg-red-600 hover:bg-red-700"
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTracker 
            students={students}
            attendance={attendance}
            onMarkAttendance={onMarkAttendance}
          />
        </TabsContent>

        <TabsContent value="fees">
          <FeeManagement 
            students={students}
            fees={fees}
            onAddFee={onAddFee}
            onUpdateFeeStatus={onUpdateFeeStatus}
          />
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengesManager 
            challenges={challenges}
            studentChallenges={studentChallenges}
            students={students}
            onAddChallenge={onAddChallenge}
            onCompleteChallenge={onCompleteChallenge}
          />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsManager 
            announcements={announcements}
            onAddAnnouncement={onAddAnnouncement}
          />
        </TabsContent>

        <TabsContent value="reports">
          <TestResultsView 
            tests={tests}
            testResults={testResults}
            students={students}
          />
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
