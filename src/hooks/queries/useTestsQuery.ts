import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyTest, StudentTestResult, ClassName } from '@/types';
import { toast } from 'sonner';

const STALE_TIME = 10 * 60 * 1000; // 10 minutes
const GC_TIME = 45 * 60 * 1000; // 45 minutes

export function useWeeklyTestsQuery(tuitionId: string | null, opts?: { loadHistory?: boolean }) {
  return useQuery({
    queryKey: ['weeklyTests', tuitionId, opts?.loadHistory ? 'all' : 'year'],
    queryFn: async () => {
      if (!tuitionId) return [];

      const baseQuery = supabase
        .from('weekly_tests')
        .select('*')
        .eq('tuition_id', tuitionId)
        .order('test_date', { ascending: false });

      const allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data, error } = await baseQuery.range(from, from + PAGE_SIZE - 1);
        if (error) {
          console.error('Error fetching weekly tests:', error);
          throw error;
        }
        allData.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return allData.map(test => ({
        id: test.id,
        name: test.name,
        subject: test.subject,
        maxMarks: test.max_marks,
        date: test.test_date,
        class: test.class as ClassName,
        divisionId: test.division_id ?? undefined,
      })) as WeeklyTest[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTestResultsQuery(tuitionId: string | null, testId?: string, opts?: { loadHistory?: boolean }) {
  return useQuery({
    queryKey: ['testResults', tuitionId, testId, opts?.loadHistory ? 'all' : 'year'],
    queryFn: async () => {
      if (!tuitionId) return [];

      const query = supabase
        .from('student_test_results')
        .select('test_id, student_id, marks, is_absent, weekly_tests!inner(tuition_id, test_date)')
        .eq('weekly_tests.tuition_id', tuitionId);

      const scopedQuery = testId ? query.eq('test_id', testId) : query;

      // Paginate to get ALL results (no blanket limit)
      const allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data, error } = await scopedQuery.range(from, from + PAGE_SIZE - 1);
        if (error) {
          console.error('Error fetching test results:', error);
          throw error;
        }
        allData.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
        // Safety cap at 10000 to prevent runaway loops
        if (from >= 10000) break;
      }

      return allData.map((r: any) => ({
        testId: r.test_id,
        studentId: r.student_id,
        marks: Number(r.marks),
        isAbsent: !!r.is_absent,
      })) as StudentTestResult[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useAddWeeklyTestMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTest: Omit<WeeklyTest, 'id'>) => {
      if (!tuitionId) throw new Error('No tuition ID');

      const { error } = await supabase
        .from('weekly_tests')
        .insert({
          name: newTest.name,
          subject: newTest.subject,
          max_marks: newTest.maxMarks,
          test_date: newTest.date,
          class: newTest.class,
          division_id: newTest.divisionId ?? null,
          tuition_id: tuitionId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyTests', tuitionId] });
      toast.success('Test created successfully!');
    },
    onError: (error) => {
      console.error('Error adding test:', error);
      toast.error('Failed to create test');
    },
  });
}

export function useDeleteWeeklyTestMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testId: string) => {
      await supabase.from('student_test_results').delete().eq('test_id', testId);
      const { error } = await supabase.from('weekly_tests').delete().eq('id', testId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyTests', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['testResults', tuitionId] });
      toast.success('Test deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting test:', error);
      toast.error('Failed to delete test');
    },
  });
}

export function useAddTestResultMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (result: StudentTestResult) => {
      const { error } = await supabase
        .from('student_test_results')
        .upsert({
          test_id: result.testId,
          student_id: result.studentId,
          marks: result.marks,
          is_absent: result.isAbsent ?? false,
        }, { onConflict: 'test_id,student_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testResults', tuitionId] });
    },
    onError: (error) => {
      console.error('Error adding test result:', error);
      toast.error('Failed to save test result');
    },
  });
}

export function useAddTestResultsBatchMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (results: StudentTestResult[]) => {
      if (results.length === 0) return;

      const dedupedRecords = Array.from(
        new Map(
          results.map((result) => [
            `${result.testId}:${result.studentId}`,
            {
              test_id: result.testId,
              student_id: result.studentId,
              marks: result.marks,
              is_absent: result.isAbsent ?? false,
            },
          ])
        ).values()
      );

      const { error } = await supabase
        .from('student_test_results')
        .upsert(dedupedRecords, { onConflict: 'test_id,student_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testResults', tuitionId] });
      toast.success('Marks saved successfully!');
    },
    onError: (error) => {
      console.error('Error adding test results:', error);
      toast.error('Failed to save test results');
    },
  });
}
