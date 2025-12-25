import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useTuitionInfo } from "@/hooks/useTuitionInfo";
import { useTermExamData } from "@/hooks/useTermExamData";
import { useUserTuition } from "@/hooks/useUserTuition";
import { useTuitionFeatures } from "@/hooks/useTuitionFeatures";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { ManagementCards } from "@/components/ManagementCards";
import { QuickActions } from "@/components/QuickActions";
import { RecentTests } from "@/components/RecentTests";
import { FeatureGate } from "@/components/FeatureGate";
import { PortalEmailConfig } from "@/components/PortalEmailConfig";
import { HomeworkManager } from "@/components/HomeworkManager";
import { BackupDashboard } from "@/components/BackupDashboard";
import { AttendanceNotificationAlert } from "@/components/AttendanceNotificationAlert";
import { useAttendanceNotification } from "@/hooks/useAttendanceNotification";
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

// Loading component for lazy routes
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
  const {
    termExams,
    termExamSubjects,
    termExamResults,
    loading: termExamLoading,
    addTermExam,
    deleteTermExam,
    addTermExamResult,
    bulkAddTermExamResults,
  } = useTermExamData();
  const {
    students,
    weeklyTests,
    testResults,
    challenges,
    studentChallenges,
    announcements,
    attendance,
    fees,
    classFees,
    subjects,
    faculty,
    divisions,
    timetable,
    loading,
    addStudent,
    addWeeklyTest,
    deleteWeeklyTest,
    addTestResult,
    addXp,
    awardXP,
    removeStudent,
    assignTeam,
    buyReward,
    useReward,
    addChallenge,
    completeChallenge,
    addAnnouncement,
    markAttendance,
    addFee,
    updateFeeStatus,
    updateClassFee,
  } = useSupabaseData();

  // Attendance notification system
  const { pendingClass, dismissNotification } = useAttendanceNotification(
    timetable || [],
    attendance,
    subjects,
    faculty
  );

  const handleSharePortalLink = () => {
    const portalUrl = `${window.location.origin}/student`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Student portal link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading || termExamLoading || featuresLoading) {
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
      />
      <Routes>
        <Route path="/" element={
          <div className="w-full px-3 py-4 sm:px-4 space-y-3 sm:space-y-4 bg-[#f8f9fa]">
          <div className="flex items-center justify-between mb-4 gap-2">
            <TuitionBranding 
              name={tuition?.name || 'Dashboard'} 
              logoUrl={tuition?.logo_url}
            />
            <div className="flex items-center gap-2">
              {tuitionId && (
                <PortalEmailConfig
                  tuitionId={tuitionId}
                  currentEmail={tuition?.portal_email}
                  onUpdate={refetchTuition}
                />
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSharePortalLink}
                className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share Portal'}</span>
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>
                      Manage your tuition center settings and backups
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <BackupDashboard />
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
          
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

          {/* Homework Manager - Feature Gated */}
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
        <Suspense fallback={<RouteLoader />}>
          <TestsPage />
        </Suspense>
      } />
      <Route path="/leaderboard" element={
        <FeatureGate featureKey="leaderboard" featureName="Leaderboard">
          <Suspense fallback={<RouteLoader />}>
            <LeaderboardPage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/materials" element={
        <FeatureGate featureKey="materials" featureName="Materials">
          <Suspense fallback={<RouteLoader />}>
            <MaterialsPage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/fees" element={
        <FeatureGate featureKey="fees" featureName="Fees">
          <Suspense fallback={<RouteLoader />}>
            <FeesPage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/attendance" element={
        <FeatureGate featureKey="attendance" featureName="Attendance">
          <Suspense fallback={<RouteLoader />}>
            <AttendancePage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/timetable" element={
        <FeatureGate featureKey="timetable" featureName="Timetable">
          <Suspense fallback={<RouteLoader />}>
            <TimetablePage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/classes" element={
        <Suspense fallback={<RouteLoader />}>
          <ClassesPage />
        </Suspense>
      } />
      <Route path="/students" element={
        <Suspense fallback={<RouteLoader />}>
          <StudentsPage />
        </Suspense>
      } />
      <Route path="/reports" element={
        <FeatureGate featureKey="reports" featureName="Reports">
          <Suspense fallback={<RouteLoader />}>
            <ReportsPage />
          </Suspense>
        </FeatureGate>
      } />
      </Routes>
    </>
  );
};

export default Index;
