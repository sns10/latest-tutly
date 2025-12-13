import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClassName } from '@/types';

interface LeaderboardStudent {
  id: string;
  name: string;
  class: ClassName;
  avatar: string;
  totalXp: number;
  attendanceStreak: number;
  division?: {
    id: string;
    name: string;
  };
}

export function useStudentLeaderboard(tuitionId: string | null) {
  const [leaderboardStudents, setLeaderboardStudents] = useState<LeaderboardStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!tuitionId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch students
        const { data: students, error } = await supabase
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

        // Fetch attendance for all students
        const { data: attendance } = await supabase
          .from('student_attendance')
          .select('student_id, date, status')
          .in('student_id', students.map(s => s.id))
          .eq('status', 'present')
          .order('date', { ascending: false });

        // Calculate streaks for each student
        const streakMap: Record<string, number> = {};
        
        if (attendance) {
          // Group by student
          const attendanceByStudent: Record<string, string[]> = {};
          attendance.forEach(a => {
            if (!attendanceByStudent[a.student_id!]) {
              attendanceByStudent[a.student_id!] = [];
            }
            attendanceByStudent[a.student_id!].push(a.date);
          });

          // Calculate streak for each student
          Object.entries(attendanceByStudent).forEach(([studentId, dates]) => {
            const uniqueDates = [...new Set(dates)].sort((a, b) => 
              new Date(b).getTime() - new Date(a).getTime()
            );

            if (uniqueDates.length === 0) {
              streakMap[studentId] = 0;
              return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const mostRecent = new Date(uniqueDates[0]);
            mostRecent.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 1) {
              streakMap[studentId] = 0;
              return;
            }

            let streak = 1;
            for (let i = 1; i < uniqueDates.length; i++) {
              const date = new Date(uniqueDates[i]);
              date.setHours(0, 0, 0, 0);
              
              const prevDate = new Date(uniqueDates[i - 1]);
              prevDate.setHours(0, 0, 0, 0);
              
              const diff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diff === 1) {
                streak++;
              } else {
                break;
              }
            }

            streakMap[studentId] = streak;
          });
        }

        const formatted: LeaderboardStudent[] = students.map(s => ({
          id: s.id,
          name: s.name,
          class: s.class as ClassName,
          avatar: s.avatar || '',
          totalXp: s.total_xp,
          attendanceStreak: streakMap[s.id] || 0,
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
