import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentFee, ClassFee, ClassName } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

interface FeeFilters {
  status?: 'paid' | 'unpaid' | 'partial' | 'overdue';
  studentId?: string;
  month?: string; // YYYY-MM format
}

const formatFees = (data: any[]): StudentFee[] => {
  return data.map(fee => ({
    id: fee.id,
    studentId: fee.student_id || '',
    feeType: fee.fee_type || 'Monthly Fee',
    amount: Number(fee.amount) || 0,
    dueDate: fee.due_date,
    paidDate: fee.paid_date || undefined,
    status: fee.status as 'paid' | 'unpaid' | 'partial' | 'overdue',
    notes: fee.notes || undefined,
    createdAt: fee.created_at,
    updatedAt: fee.updated_at,
  }));
};

export function useFeesQuery(tuitionId: string | null, filters?: FeeFilters) {
  return useQuery({
    queryKey: ['fees', tuitionId, filters],
    queryFn: async () => {
      if (!tuitionId) return [];

      let query = supabase
        .from('student_fees')
        .select('*')
        .order('due_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      if (filters?.month) {
        const startOfMonth = `${filters.month}-01`;
        const endOfMonth = new Date(parseInt(filters.month.split('-')[0]), parseInt(filters.month.split('-')[1]), 0)
          .toISOString().split('T')[0];
        query = query.gte('due_date', startOfMonth).lte('due_date', endOfMonth);
      }

      // Limit to reasonable amount
      query = query.limit(500);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching fees:', error);
        throw error;
      }

      return formatFees(data || []);
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useClassFeesQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['classFees', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('class_fees')
        .select('*')
        .eq('tuition_id', tuitionId);

      if (error) {
        console.error('Error fetching class fees:', error);
        throw error;
      }

      return data.map(d => ({ 
        class: d.class as ClassName, 
        amount: Number(d.amount) 
      })) as ClassFee[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTodayPaymentsQuery(tuitionId: string | null) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['todayPayments', tuitionId, today],
    queryFn: async () => {
      if (!tuitionId) return 0;

      // Get all fee IDs for this tuition's students first
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('tuition_id', tuitionId);

      if (studentsError) {
        console.error('Error fetching students for payments:', studentsError);
        return 0;
      }

      if (!students || students.length === 0) return 0;

      const studentIds = students.map(s => s.id);

      // Get fees for these students
      const { data: fees, error: feesError } = await supabase
        .from('student_fees')
        .select('id')
        .in('student_id', studentIds);

      if (feesError) {
        console.error('Error fetching fees:', feesError);
        return 0;
      }

      if (!fees || fees.length === 0) return 0;

      const feeIds = fees.map(f => f.id);

      // Get today's payments for these fees
      const { data: payments, error: paymentsError } = await supabase
        .from('fee_payments')
        .select('amount')
        .in('fee_id', feeIds)
        .eq('payment_date', today);

      if (paymentsError) {
        console.error('Error fetching today payments:', paymentsError);
        return 0;
      }

      // Sum up all payments
      const total = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      return total;
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useAddFeeMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newFee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { error } = await supabase
        .from('student_fees')
        .insert({
          student_id: newFee.studentId,
          fee_type: newFee.feeType,
          amount: newFee.amount,
          due_date: newFee.dueDate,
          paid_date: newFee.paidDate || null,
          status: newFee.status,
          notes: newFee.notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
      toast.success('Fee added successfully!');
    },
    onError: (error) => {
      console.error('Error adding fee:', error);
      toast.error('Failed to add fee');
    },
  });
}

export function useUpdateFeeStatusMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { feeId: string; status: 'paid' | 'unpaid' | 'partial' | 'overdue'; paidDate?: string }) => {
      const { error } = await supabase
        .from('student_fees')
        .update({
          status: params.status,
          paid_date: params.paidDate || null,
        })
        .eq('id', params.feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
    },
    onError: (error) => {
      console.error('Error updating fee status:', error);
      toast.error('Failed to update fee status');
    },
  });
}

export function useDeleteFeeMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeId: string) => {
      // Delete associated payments first
      await supabase.from('fee_payments').delete().eq('fee_id', feeId);

      const { error } = await supabase
        .from('student_fees')
        .delete()
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
      toast.success('Fee deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting fee:', error);
      toast.error('Failed to delete fee');
    },
  });
}

export function useUpdateClassFeeMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { className: string; amount: number }) => {
      if (!tuitionId) throw new Error('No tuition ID');

      const { data: existing } = await supabase
        .from('class_fees')
        .select('id')
        .eq('class', params.className)
        .eq('tuition_id', tuitionId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('class_fees')
          .update({ amount: params.amount })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_fees')
          .insert({ class: params.className, amount: params.amount, tuition_id: tuitionId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classFees', tuitionId] });
    },
    onError: (error) => {
      console.error('Error updating class fee:', error);
      toast.error('Failed to update class fee');
    },
  });
}
