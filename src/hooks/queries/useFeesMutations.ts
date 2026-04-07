import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentFee } from '@/types';
import { toast } from 'sonner';

export function useAddFeesBatchMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newFees: Array<Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (newFees.length === 0) return;

      const feeRecords = newFees.map(fee => ({
        student_id: fee.studentId,
        fee_type: fee.feeType,
        amount: fee.amount,
        due_date: fee.dueDate,
        paid_date: fee.paidDate || null,
        status: fee.status,
        notes: fee.notes || null,
      }));

      const { error } = await supabase.from('student_fees').insert(feeRecords);
      if (error) throw error;

      return newFees.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['classFees', tuitionId] });
      toast.success(`Generated fees for ${count} students`);
    },
    onError: (error) => {
      console.error('Error adding fees batch:', error);
      toast.error('Failed to generate fees');
    },
  });
}
