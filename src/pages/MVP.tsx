import { useSupabaseData } from '@/hooks/useSupabaseData';
import { WeeklyMVP } from '@/components/WeeklyMVP';
import { Loader2 } from 'lucide-react';

export default function MVPPage() {
  const { students, loading } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const mvpStudent = students.length > 0 
    ? students.reduce((prev, current) => (prev.totalXp > current.totalXp) ? prev : current)
    : null;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <WeeklyMVP student={mvpStudent} />
    </div>
  );
}
