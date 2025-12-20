import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';
import { ClassName } from '@/types';

interface DashboardStats {
  studentsCount: number;
  testsCount: number;
  todayAttendance: {
    present: number;
    total: number;
  };
  pendingFeesCount: number;
  activeChallengesCount: number;
}

// Lightweight hook for dashboard - only fetches counts, not full data
export function useDashboardData() {
  const { tuitionId } = useUserTuition();

  return useQuery({
    queryKey: ['dashboard-stats', tuitionId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!tuitionId) {
        return {
          studentsCount: 0,
          testsCount: 0,
          todayAttendance: { present: 0, total: 0 },
          pendingFeesCount: 0,
          activeChallengesCount: 0,
        };
      }

      const today = new Date().toISOString().split('T')[0];

      // Fetch counts in parallel - much faster than full data
      const [
        studentsResult,
        testsResult,
        attendanceResult,
        feesResult,
        challengesResult,
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('weekly_tests').select('id', { count: 'exact', head: true }),
        supabase.from('student_attendance').select('status').eq('date', today),
        supabase.from('student_fees').select('id', { count: 'exact', head: true }).in('status', ['unpaid', 'overdue']),
        supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const todayAttendance = attendanceResult.data || [];
      const presentCount = todayAttendance.filter(a => a.status === 'present').length;

      return {
        studentsCount: studentsResult.count || 0,
        testsCount: testsResult.count || 0,
        todayAttendance: {
          present: presentCount,
          total: todayAttendance.length,
        },
        pendingFeesCount: feesResult.count || 0,
        activeChallengesCount: challengesResult.count || 0,
      };
    },
    enabled: !!tuitionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for recent tests only - for dashboard
export function useRecentTests(limit = 5) {
  const { tuitionId } = useUserTuition();

  return useQuery({
    queryKey: ['recent-tests', tuitionId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_tests')
        .select('*')
        .order('test_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(test => ({
        id: test.id,
        name: test.name,
        subject: test.subject,
        maxMarks: test.max_marks,
        date: test.test_date,
        class: test.class as ClassName,
      }));
    },
    enabled: !!tuitionId,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for subjects only
export function useSubjectsData() {
  const { tuitionId } = useUserTuition();

  return useQuery({
    queryKey: ['subjects', tuitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('class', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return data.map(subject => ({
        id: subject.id,
        name: subject.name,
        class: subject.class as ClassName,
        createdAt: subject.created_at,
      }));
    },
    enabled: !!tuitionId,
    staleTime: 5 * 60 * 1000,
  });
}
