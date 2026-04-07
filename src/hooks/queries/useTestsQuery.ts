import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyTest, StudentTestResult, ClassName } from '@/types';
import { toast } from 'sonner';

const STALE_TIME = 10 * 60 * 1000; // 10 minutes
const GC_TIME = 45 * 60 * 1000; // 45 minutes

export function useWeeklyTestsQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['weeklyTests', tuitionId],
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
      })) as WeeklyTest[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTestResultsQuery(tuitionId: string | null, testId?: string) {
  return useQuery({
    queryKey: ['testResults', tuitionId, testId],
    queryFn: async () => {
      if (!tuitionId) return [];

      let query = supabase
        .from('student_test_results')
        .select('test_id, student_id, marks, weekly_tests!inner(tuition_id)')
        .eq('weekly_tests.tuition_id', tuitionId);

      if (testId) {
        query = query.eq('test_id', testId);
      }

      // Paginate to get ALL results (no blanket limit)
      const allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
        if (error) {
          console.error('Error fetching test results:', error);
          throw error;
        }
        allData.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
        // Safety cap at 5000 for dashboard stability
        if (from >= 5000) break;
      }

      return allData.map((r: any) => ({
        testId: r.test_id,
        studentId: r.student_id,
        marks: Number(r.marks),
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

      const records = results.map(result => ({
        test_id: result.testId,
        student_id: result.studentId,
        marks: result.marks,
      }));

      const { error } = await supabase
        .from('student_test_results')
        .upsert(records, { onConflict: 'test_id,student_id' });

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
