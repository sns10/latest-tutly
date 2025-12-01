
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { ManagementCards } from "@/components/ManagementCards";
import { QuickActions } from "@/components/QuickActions";
import { RecentTests } from "@/components/RecentTests";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import LeaderboardPage from './Leaderboard';
import MaterialsPage from './Materials';
import FeesPage from './Fees';
import AttendancePage from './Attendance';
import TimetablePage from './Timetable';
import ClassesPage from './Classes';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
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

  if (authLoading || loading) {
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
    <Routes>
      <Route path="/" element={
        <div className="p-4 space-y-4 max-w-7xl mx-auto bg-[#f8f9fa]">
          <div>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-600">Welcome back! Here's your overview</p>
          </div>
          
          <ManagementCards 
            testsCount={weeklyTests.length}
            studentsCount={students.length}
            attendanceToday={75}
            pendingFees={12}
            activeChallenges={challenges.filter(c => c.isActive).length}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <QuickActions onAddTest={addWeeklyTest} />
            <RecentTests 
              tests={weeklyTests}
              testResults={testResults}
              students={students}
              onAddTestResult={addTestResult}
              onAwardXP={awardXP}
            />
          </div>

          <Card className="bg-white border border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">All Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyTestManager
                tests={weeklyTests}
                testResults={testResults}
                students={students}
                challenges={challenges}
                studentChallenges={studentChallenges}
                announcements={announcements}
                attendance={attendance}
                fees={fees}
                classFees={classFees}
                onAddTest={addWeeklyTest}
                onDeleteTest={deleteWeeklyTest}
                onAddTestResult={addTestResult}
                onAwardXP={awardXP}
                onAddChallenge={addChallenge}
                onCompleteChallenge={completeChallenge}
                onAddAnnouncement={addAnnouncement}
                onMarkAttendance={markAttendance}
                onAddFee={addFee}
                onUpdateFeeStatus={updateFeeStatus}
                onUpdateClassFee={updateClassFee}
              />
            </CardContent>
          </Card>
        </div>
      } />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/fees" element={<FeesPage />} />
      <Route path="/attendance" element={<AttendancePage />} />
      <Route path="/timetable" element={<TimetablePage />} />
      <Route path="/classes" element={<ClassesPage />} />
    </Routes>
  );
};

export default Index;
