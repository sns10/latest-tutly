import { useSupabaseData } from '@/hooks/useSupabaseData';
import { TeamLeaderboard } from '@/components/TeamLeaderboard';
import { Loader2 } from 'lucide-react';

export default function TeamsPage() {
  const { students, loading } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const teamScores = students.reduce((acc, student) => {
    if (student.team) {
      acc[student.team] = (acc[student.team] || 0) + student.totalXp;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <TeamLeaderboard scores={teamScores} />
    </div>
  );
}
