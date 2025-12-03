import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useTuitionInfo } from "@/hooks/useTuitionInfo";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { ManagementCards } from "@/components/ManagementCards";
import { QuickActions } from "@/components/QuickActions";
import { RecentTests } from "@/components/RecentTests";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import LeaderboardPage from './Leaderboard';
import MaterialsPage from './Materials';
import FeesPage from './Fees';
import AttendancePage from './Attendance';
import TimetablePage from './Timetable';
import ClassesPage from './Classes';
import StudentsPage from './Students';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { tuition } = useTuitionInfo();
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
        <div className="w-full px-3 py-4 sm:px-4 space-y-3 sm:space-y-4 bg-[#f8f9fa]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {tuition?.name || 'Dashboard'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Powered by <span className="font-semibold text-indigo-600">Upskillr Tutly</span>
              </p>
            </div>
          </div>
          
          <ManagementCards 
            testsCount={weeklyTests.length}
            studentsCount={students.length}
            attendanceToday={
              attendance.length > 0 
                ? Math.round((attendance.filter(a => a.status === 'present' && a.date === new Date().toISOString().split('T')[0]).length / 
                    attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length) * 100) || 0
                : 0
            }
            pendingFees={fees.filter(f => f.status === 'unpaid' || f.status === 'overdue').length}
            activeChallenges={challenges.filter(c => c.isActive).length}
          />

          <QuickActions onAddTest={addWeeklyTest} />
          
          <RecentTests 
            tests={weeklyTests}
            testResults={testResults}
            students={students}
            onAddTestResult={addTestResult}
            onAwardXP={awardXP}
          />

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
                attendance={attendance}
                fees={fees}
                classFees={classFees}
                subjects={subjects}
                faculty={faculty}
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
      <Route path="/students" element={<StudentsPage />} />
    </Routes>
  );
};

export default Index;
