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

      // Plain insert. The client (FeesList.generateMonthlyFees) already filters
      // out students with an existing fee for the target month, so duplicates
      // are rare. The DB has a PARTIAL unique index on (student_id, fee_type)
      // WHERE fee_type LIKE 'Monthly Fee - %' as a safety net — but Postgres
      // rejects ON CONFLICT against a partial index, so we can't use upsert.
      const { data, error } = await supabase
        .from('student_fees')
        .insert(feeRecords)
        .select('id');

      if (error && (error as any).code === '23505') {
        // A duplicate slipped through (stale cache). Fall back to per-row
        // inserts and skip the offending rows so the rest still get created.
        let inserted = 0;
        for (const row of feeRecords) {
          const { error: rowErr } = await supabase
            .from('student_fees')
            .insert(row);
          if (!rowErr) {
            inserted += 1;
          } else if ((rowErr as any).code !== '23505') {
            throw rowErr;
          }
        }
        return inserted;
      }

      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['classFees', tuitionId] });
      if (count && count > 0) {
        toast.success(`Generated fees for ${count} students`);
      } else {
        toast.info('All students already have fees for the selected month');
      }
    },
    onError: (error) => {
      console.error('Error adding fees batch:', error);
      toast.error('Failed to generate fees');
    },
  });
}

// ---- Void payments (single or all on a fee) ----

export function useVoidFeePaymentsMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feeId: string) => {
      const { error } = await supabase.rpc('void_fee_payments', { p_fee_id: feeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['feePayments', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['todayPayments', tuitionId] });
      toast.success('Fee reset — all payments removed');
    },
    onError: (e: any) => {
      console.error('void_fee_payments failed', e);
      toast.error(e?.message || 'Failed to reset fee');
    },
  });
}

export function useVoidFeePaymentMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.rpc('void_fee_payment', { p_payment_id: paymentId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['feePayments', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['todayPayments', tuitionId] });
      toast.success('Payment voided');
    },
    onError: (e: any) => {
      console.error('void_fee_payment failed', e);
      toast.error(e?.message || 'Failed to void payment');
    },
  });
}
