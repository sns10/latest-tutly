import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Leaderboard as LeaderboardComponent } from '@/components/Leaderboard';
import { Loader2 } from 'lucide-react';

export default function LeaderboardPage() {
  const {
    students,
    divisions,
    attendance,
    testResults,
    weeklyTests,
    fees,
    subjects,
    faculty,
    loading,
    addStudent,
    addXp,
    removeStudent,
    buyReward,
    useReward,
    assignTeam,
  } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6">
      <LeaderboardComponent
        students={students}
        divisions={divisions}
        attendance={attendance}
        testResults={testResults}
        weeklyTests={weeklyTests}
        fees={fees}
        subjects={subjects}
        faculty={faculty}
        onAddStudent={addStudent}
        onAddXp={addXp}
        onRemoveStudent={removeStudent}
        onBuyReward={buyReward}
        onUseReward={useReward}
        onAssignTeam={assignTeam}
      />
    </div>
  );
}
