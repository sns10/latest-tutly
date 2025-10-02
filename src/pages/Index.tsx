
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { Loader2 } from "lucide-react";
import LeaderboardPage from './Leaderboard';
import TeamsPage from './Teams';
import MVPPage from './MVP';
import MaterialsPage from './Materials';
import AnalysisPage from './Analysis';
import ReportsPage from './Reports';
import FeesPage from './Fees';

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
        <div className="container mx-auto p-4 sm:p-6">
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
            </div>
          } />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/mvp" element={<MVPPage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/analysis" element={<AnalysisPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/fees" element={<FeesPage />} />
    </Routes>
  );
};

export default Index;
