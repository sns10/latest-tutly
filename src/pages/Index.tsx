import { lazy, Suspense, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useTuitionInfo } from "@/hooks/useTuitionInfo";
import { useTermExamData } from "@/hooks/useTermExamData";
import { useUserTuition } from "@/hooks/useUserTuition";
import { useTuitionFeatures } from "@/hooks/useTuitionFeatures";
import {
  useStudentsQuery,
  useDivisionsQuery,
  useSubjectsQuery,
  useFacultyQuery,
  useAttendanceQuery,
  useTimetableQuery,
  useFeesQuery,
  useClassFeesQuery,
  useChallengesQuery,
  useAnnouncementsQuery,
  useStudentChallengesQuery,
  useWeeklyTestsQuery,
  useTestResultsQuery,
  useAddStudentMutation,
  useRemoveStudentMutation,
  useAddWeeklyTestMutation,
  useDeleteWeeklyTestMutation,
  useAddTestResultMutation,
  useMarkAttendanceMutation,
  useAddFeeMutation,
  useUpdateFeeStatusMutation,
  useUpdateClassFeeMutation,
} from "@/hooks/queries";
import { useAddXpMutation, useAwardXpMutation, useBuyRewardMutation, useUseRewardMutation } from "@/hooks/queries/useXpMutations";
import { useAssignTeamMutation } from "@/hooks/queries/useStudentMutations";
import { useAddChallengeMutation, useCompleteChallengeMutation } from "@/hooks/queries/useChallengeMutations";
import { useAddAnnouncementMutation } from "@/hooks/queries/useAnnouncementMutations";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { ManagementCards } from "@/components/ManagementCards";
import { DailySummaryCard } from "@/components/DailySummaryCard";
import { QuickActions } from "@/components/QuickActions";
import { RecentTests } from "@/components/RecentTests";
import { FeatureGate } from "@/components/FeatureGate";
import { PortalEmailConfig } from "@/components/PortalEmailConfig";
import { HomeworkManager } from "@/components/HomeworkManager";
import { BackupDashboard } from "@/components/BackupDashboard";
import { AttendanceNotificationAlert } from "@/components/AttendanceNotificationAlert";
import { StudentAlertsCard } from "@/components/StudentAlertsCard";
import { useStudentAlerts } from "@/hooks/useStudentAlerts";
import { SubscriptionExpiryAlert } from "@/components/SubscriptionExpiryAlert";
import { BirthdayWishesBanner } from "@/components/BirthdayWishesBanner";
import { useAttendanceNotification } from "@/hooks/useAttendanceNotification";
import { useDailySummary } from "@/hooks/useDailySummary";
import { useTodayPaymentsQuery } from "@/hooks/queries/useFeesQuery";
import { Student, WeeklyTest, StudentTestResult, XPCategory, Challenge, Announcement, StudentFee, TeamName } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TuitionBranding } from "@/components/TuitionBranding";
import { Loader2, LogOut, Share2, Check, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Lazy load sub-pages for code splitting
const LeaderboardPage = lazy(() => import('./Leaderboard'));
const MaterialsPage = lazy(() => import('./Materials'));
const FeesPage = lazy(() => import('./Fees'));
const AttendancePage = lazy(() => import('./Attendance'));
const TimetablePage = lazy(() => import('./Timetable'));
const ClassesPage = lazy(() => import('./Classes'));
const StudentsPage = lazy(() => import('./Students'));
const ReportsPage = lazy(() => import('./Reports'));
const TestsPage = lazy(() => import('./Tests'));

const RouteLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
);

const Index = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { tuition, refetch: refetchTuition } = useTuitionInfo();
  const { tuitionId } = useUserTuition();
  const { isFeatureEnabled, loading: featuresLoading } = useTuitionFeatures();
  const [copied, setCopied] = useState(false);

  // Domain queries — only what the dashboard needs
  const { data: students = [], isLoading: studentsLoading } = useStudentsQuery(tuitionId);
  const { data: divisions = [] } = useDivisionsQuery(tuitionId);
  const { data: subjects = [] } = useSubjectsQuery(tuitionId);
  const { data: faculty = [] } = useFacultyQuery(tuitionId);
  const { data: attendance = [] } = useAttendanceQuery(tuitionId);
  const { data: timetable = [] } = useTimetableQuery(tuitionId);
  const { data: fees = [] } = useFeesQuery(tuitionId);
  const { data: classFees = [] } = useClassFeesQuery(tuitionId);
  const { data: challenges = [] } = useChallengesQuery(tuitionId);
  const { data: announcements = [] } = useAnnouncementsQuery(tuitionId);
  const { data: studentChallenges = [] } = useStudentChallengesQuery(tuitionId);
  const { data: weeklyTests = [] } = useWeeklyTestsQuery(tuitionId);
  const { data: testResults = [] } = useTestResultsQuery(tuitionId);

  // Mutations
  const addStudentMut = useAddStudentMutation(tuitionId);
  const removeStudentMut = useRemoveStudentMutation(tuitionId);
  const addTestMut = useAddWeeklyTestMutation(tuitionId);
  const deleteTestMut = useDeleteWeeklyTestMutation(tuitionId);
  const addResultMut = useAddTestResultMutation(tuitionId);
  const addXpMut = useAddXpMutation(tuitionId);
  const awardXpMut = useAwardXpMutation(tuitionId);
  const assignTeamMut = useAssignTeamMutation(tuitionId);
  const buyRewardMut = useBuyRewardMutation(tuitionId);
  const useRewardMut = useUseRewardMutation(tuitionId);
  const addChallengeMut = useAddChallengeMutation(tuitionId);
  const completeChallengeMut = useCompleteChallengeMutation(tuitionId);
  const addAnnouncementMut = useAddAnnouncementMutation(tuitionId);
  const markAttendanceMut = useMarkAttendanceMutation(tuitionId);
  const addFeeMut = useAddFeeMutation(tuitionId);
  const updateFeeStatusMut = useUpdateFeeStatusMutation(tuitionId);
  const updateClassFeeMut = useUpdateClassFeeMutation(tuitionId);

  // Term exams
  const {
    termExams, termExamSubjects, termExamResults,
    loading: termExamLoading,
    addTermExam, deleteTermExam, addTermExamResult, bulkAddTermExamResults,
  } = useTermExamData();

  // Wrapper functions
  const addStudent = (newStudent: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => {
    addStudentMut.mutate({
      name: newStudent.name, class: newStudent.class, divisionId: newStudent.divisionId,
      avatar: newStudent.avatar, rollNo: newStudent.rollNo, phone: newStudent.phone,
      dateOfBirth: newStudent.dateOfBirth, parentName: newStudent.parentName,
      parentPhone: newStudent.fatherPhone || newStudent.parentPhone,
      address: newStudent.address, gender: newStudent.gender, email: newStudent.email,
    });
  };

  const addWeeklyTest = (newTest: Omit<WeeklyTest, 'id'>) => { addTestMut.mutate(newTest); };
  const deleteWeeklyTest = (testId: string) => { deleteTestMut.mutate(testId); };

  const addTestResult = async (result: StudentTestResult): Promise<boolean> => {
    try { await addResultMut.mutateAsync(result); return true; } catch { return false; }
  };

  const awardXP = (studentId: string, amount: number, reason: string) => {
    const student = students.find(s => s.id === studentId);
    awardXpMut.mutate({ studentId, amount, reason, studentName: student?.name });
  };

  const removeStudent = (studentId: string) => { removeStudentMut.mutate(studentId); };

  const addChallenge = (newChallenge: Omit<Challenge, 'id' | 'createdAt'>) => {
    addChallengeMut.mutate(newChallenge);
  };

  const completeChallenge = (studentId: string, challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    completeChallengeMut.mutate({
      studentId, challengeId,
      xpReward: challenge?.xpReward || 0,
      challengeTitle: challenge?.title || '',
    });
  };

  const addAnnouncement = (newAnnouncement: Omit<Announcement, 'id' | 'publishedAt'>) => {
    addAnnouncementMut.mutate(newAnnouncement);
  };

  const markAttendance = useCallback((
    studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused',
    notes?: string, subjectId?: string, facultyId?: string
  ) => {
    markAttendanceMut.mutate({ studentId, date, status, notes, subjectId, facultyId });
  }, [markAttendanceMut]);

  const addFee = (newFee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => {
    addFeeMut.mutate(newFee);
  };

  const updateFeeStatus = (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => {
    updateFeeStatusMut.mutate({ feeId, status, paidDate });
  };

  const updateClassFee = (className: string, amount: number) => {
    updateClassFeeMut.mutate({ className, amount });
  };

  // Attendance notification system
  const { pendingClass, dismissNotification, ignoreNotification } = useAttendanceNotification(
    timetable || [], attendance, subjects, faculty
  );

  const { data: todayPayments = 0 } = useTodayPaymentsQuery(tuitionId);

  const dailySummary = useDailySummary({
    students, weeklyTests, attendance, fees,
    timetable: timetable || [], subjects, faculty, todayPayments,
  });

  const { alerts: studentAlerts, totalCount: alertsTotalCount, dismissAlert } = useStudentAlerts({
    students, attendance, weeklyTests, testResults,
    isAttendanceEnabled: isFeatureEnabled('attendance'),
  });

  const handleSharePortalLink = () => {
    const portalUrl = `${window.location.origin}/student`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Student portal link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const loading = studentsLoading;

  if (authLoading || loading || featuresLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <AttendanceNotificationAlert
        pendingClass={pendingClass}
        onDismiss={dismissNotification}
        onIgnore={ignoreNotification}
      />
      <Routes>
        <Route path="/" element={
        <div className="w-full px-3 py-4 sm:px-4 space-y-3 sm:space-y-4 bg-background">
          <SubscriptionExpiryAlert subscriptionEndDate={tuition?.subscription_end_date} />
          <BirthdayWishesBanner 
            students={students} 
            tuitionName={tuition?.name || 'Our Tuition'} 
            tuitionLogo={tuition?.logo_url}
          />
          
          <div className="mb-4 space-y-3">
            <TuitionBranding name={tuition?.name || 'Dashboard'} logoUrl={tuition?.logo_url} />
            <div className="flex items-center gap-1.5 flex-wrap">
              {tuitionId && (
                <PortalEmailConfig
                  tuitionId={tuitionId}
                  currentEmail={tuition?.portal_email}
                  onUpdate={refetchTuition}
                />
              )}
              <Button 
                variant="outline" size="sm" onClick={handleSharePortalLink}
                className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-7 text-xs px-2"
              >
                {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share Portal'}</span>
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs px-2">
                    <Settings className="h-3 w-3" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>Manage your tuition center settings, notifications, and backups</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <BackupDashboard />
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5 h-7 text-xs px-2">
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
          
          <DailySummaryCard summary={dailySummary} isFeatureEnabled={isFeatureEnabled} />
          
          <StudentAlertsCard
            alerts={studentAlerts}
            totalCount={alertsTotalCount}
            onDismiss={dismissAlert}
            students={students}
            weeklyTests={weeklyTests}
            testResults={testResults}
            attendance={attendance}
            fees={fees}
            termExams={termExams}
            termExamSubjects={termExamSubjects}
            termExamResults={termExamResults}
            subjects={subjects}
            faculty={faculty}
            onRemoveStudent={removeStudent}
          />

          <ManagementCards 
            testsCount={weeklyTests.length}
            studentsCount={students.length}
            activeChallenges={challenges.filter(c => c.isActive).length}
          />

          <QuickActions onAddTest={addWeeklyTest} subjects={subjects} />
          
          <RecentTests 
            tests={weeklyTests}
            testResults={testResults}
            students={students}
            divisions={divisions}
            onAddTestResult={addTestResult}
            onAwardXP={awardXP}
          />

          {isFeatureEnabled('homework') && <HomeworkManager />}

          <Card className="bg-white border border-gray-100 shadow-sm">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">All Tests</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <WeeklyTestManager
                tests={weeklyTests}
                testResults={testResults}
                students={students}
                challenges={challenges}
                studentChallenges={studentChallenges}
                announcements={announcements}
                subjects={subjects}
                faculty={faculty}
                divisions={divisions}
                termExams={termExams}
                termExamSubjects={termExamSubjects}
                termExamResults={termExamResults}
                tuitionName={tuition?.name}
                onAddTest={addWeeklyTest}
                onDeleteTest={deleteWeeklyTest}
                onAddTestResult={addTestResult}
                onAwardXP={awardXP}
                onAddChallenge={addChallenge}
                onCompleteChallenge={completeChallenge}
                onAddAnnouncement={addAnnouncement}
                onCreateTermExam={addTermExam}
                onDeleteTermExam={deleteTermExam}
                onAddTermExamResult={addTermExamResult}
                onBulkAddTermExamResults={bulkAddTermExamResults}
                showAttendanceTab={false}
                showFeesTab={false}
              />
            </CardContent>
          </Card>
        </div>
      } />
      <Route path="/tests" element={
        <Suspense fallback={<RouteLoader />}><TestsPage /></Suspense>
      } />
      <Route path="/leaderboard" element={
        <FeatureGate featureKey="leaderboard" featureName="Leaderboard">
          <Suspense fallback={<RouteLoader />}><LeaderboardPage /></Suspense>
        </FeatureGate>
      } />
      <Route path="/materials" element={
        <FeatureGate featureKey="materials" featureName="Materials">
          <Suspense fallback={<RouteLoader />}><MaterialsPage /></Suspense>
        </FeatureGate>
      } />
      <Route path="/fees" element={
        <FeatureGate featureKey="fees" featureName="Fees">
          <Suspense fallback={<RouteLoader />}><FeesPage /></Suspense>
        </FeatureGate>
      } />
      <Route path="/attendance" element={
        <FeatureGate featureKey="attendance" featureName="Attendance">
          <Suspense fallback={<RouteLoader />}><AttendancePage /></Suspense>
        </FeatureGate>
      } />
      <Route path="/timetable" element={
        <FeatureGate featureKey="timetable" featureName="Timetable">
          <Suspense fallback={<RouteLoader />}><TimetablePage /></Suspense>
        </FeatureGate>
      } />
      <Route path="/classes" element={
        <Suspense fallback={<RouteLoader />}><ClassesPage /></Suspense>
      } />
      <Route path="/students" element={
        <Suspense fallback={<RouteLoader />}><StudentsPage /></Suspense>
      } />
      <Route path="/reports" element={
        <FeatureGate featureKey="reports" featureName="Reports">
          <Suspense fallback={<RouteLoader />}><ReportsPage /></Suspense>
        </FeatureGate>
      } />
      </Routes>
    </>
  );
};

export default Index;
