import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Student, ClassName, Division } from '@/types';
import { useAuth } from '@/components/AuthProvider';

interface LeaderboardStudent {
  id: string;
  name: string;
  class: ClassName;
  avatar: string;
  totalXp: number;
  division?: {
    id: string;
    name: string;
  };
}

export function useStudentLeaderboard(tuitionId: string | null) {
  const { user } = useAuth();
  const [leaderboardStudents, setLeaderboardStudents] = useState<LeaderboardStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!tuitionId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            id,
            name,
            class,
            avatar,
            total_xp,
            division:divisions (id, name)
          `)
          .eq('tuition_id', tuitionId)
          .order('total_xp', { ascending: false });

        if (error) {
          console.error('Error fetching leaderboard:', error);
          setLoading(false);
          return;
        }

        const formatted: LeaderboardStudent[] = data.map(s => ({
          id: s.id,
          name: s.name,
          class: s.class as ClassName,
          avatar: s.avatar || '',
          totalXp: s.total_xp,
          division: s.division ? {
            id: s.division.id,
            name: s.division.name,
          } : undefined,
        }));

        setLeaderboardStudents(formatted);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [tuitionId]);

  return { leaderboardStudents, loading };
}
