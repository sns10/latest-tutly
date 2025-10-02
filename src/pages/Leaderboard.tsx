import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Leaderboard as LeaderboardComponent } from '@/components/Leaderboard';
import { Loader2 } from 'lucide-react';

export default function LeaderboardPage() {
  const {
    students,
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
    <div className="container mx-auto p-4 sm:p-6">
      <LeaderboardComponent
        students={students}
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
