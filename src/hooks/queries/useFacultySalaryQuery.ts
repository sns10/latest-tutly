import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PayoutMode = 'per_session' | 'monthly';

export interface FacultyRate {
  id: string;
  facultyId: string;
  class: string;
  hourlyRate: number;
}

export interface FacultySession {
  id: string;
  facultyId: string;
  subjectId: string | null;
  class: string;
  sessionDate: string;
  hours: number;
  hourlyRate: number;
  amount: number;
  notes: string | null;
}

export interface FacultyPayment {
  id: string;
  facultyId: string;
  sessionId: string | null;
  salaryMonth: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
}

/* ---------------- payout mode (per tuition centre) ---------------- */

export function usePayoutModeQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['salaryPayoutMode', tuitionId],
    queryFn: async (): Promise<PayoutMode> => {
      if (!tuitionId) return 'monthly';
      const { data, error } = await supabase
        .from('tuitions')
        .select('salary_payout_mode')
        .eq('id', tuitionId)
        .maybeSingle();
      if (error) throw error;
      return ((data?.salary_payout_mode as PayoutMode) || 'monthly');
    },
    enabled: !!tuitionId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdatePayoutModeMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mode: PayoutMode) => {
      if (!tuitionId) throw new Error('No tuition');
      const { error } = await supabase
        .from('tuitions')
        .update({ salary_payout_mode: mode })
        .eq('id', tuitionId);
      if (error) throw error;
      return mode;
    },
    onSuccess: (mode) => {
      queryClient.setQueryData(['salaryPayoutMode', tuitionId], mode);
      toast.success(mode === 'monthly' ? 'Salaries are paid monthly' : 'Salaries are paid after each class');
    },
    onError: (e) => {
      console.error('payout mode update failed', e);
      toast.error('Could not save the payment setting');
    },
  });
}

/* ---------------- hourly rates ---------------- */

export function useFacultyRatesQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['facultyRates', tuitionId],
    queryFn: async (): Promise<FacultyRate[]> => {
      if (!tuitionId) return [];
      const { data, error } = await supabase
        .from('faculty_rates')
        .select('id, faculty_id, class, hourly_rate')
        .eq('tuition_id', tuitionId);
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        facultyId: r.faculty_id,
        class: r.class,
        hourlyRate: Number(r.hourly_rate) || 0,
      }));
    },
    enabled: !!tuitionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertFacultyRateMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ facultyId, className, hourlyRate }: { facultyId: string; className: string; hourlyRate: number }) => {
      if (!tuitionId) throw new Error('No tuition');
      const { error } = await supabase
        .from('faculty_rates')
        .upsert(
          { tuition_id: tuitionId, faculty_id: facultyId, class: className, hourly_rate: hourlyRate },
          { onConflict: 'faculty_id,class' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facultyRates', tuitionId] });
      toast.success('Rate saved');
    },
    onError: (e) => {
      console.error('rate save failed', e);
      toast.error('Could not save the rate');
    },
  });
}

export function useDeleteFacultyRateMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faculty_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facultyRates', tuitionId] });
      toast.success('Rate removed');
    },
    onError: () => toast.error('Could not remove the rate'),
  });
}

/* ---------------- work sessions ---------------- */

export function useFacultySessionsQuery(tuitionId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['facultySessions', tuitionId, from, to],
    queryFn: async (): Promise<FacultySession[]> => {
      if (!tuitionId) return [];
      const { data, error } = await supabase
        .from('faculty_sessions')
        .select('id, faculty_id, subject_id, class, session_date, hours, hourly_rate, amount, notes')
        .eq('tuition_id', tuitionId)
        .gte('session_date', from)
        .lte('session_date', to)
        .order('session_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((s) => ({
        id: s.id,
        facultyId: s.faculty_id,
        subjectId: s.subject_id,
        class: s.class,
        sessionDate: s.session_date,
        hours: Number(s.hours) || 0,
        hourlyRate: Number(s.hourly_rate) || 0,
        amount: Number(s.amount) || 0,
        notes: s.notes,
      }));
    },
    enabled: !!tuitionId,
    staleTime: 60 * 1000,
  });
}

export function useAddFacultySessionMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      facultyId: string;
      className: string;
      subjectId?: string | null;
      sessionDate: string;
      hours: number;
      hourlyRate: number;
      notes?: string | null;
    }) => {
      if (!tuitionId) throw new Error('No tuition');
      const amount = Math.round(input.hours * input.hourlyRate * 100) / 100;
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('faculty_sessions').insert({
        tuition_id: tuitionId,
        faculty_id: input.facultyId,
        class: input.className,
        subject_id: input.subjectId || null,
        session_date: input.sessionDate,
        hours: input.hours,
        hourly_rate: input.hourlyRate,
        amount,
        notes: input.notes || null,
        created_by: userData?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facultySessions', tuitionId] });
      toast.success('Class hours recorded');
    },
    onError: (e) => {
      console.error('session insert failed', e);
      toast.error('Could not record the class hours');
    },
  });
}

export function useDeleteFacultySessionMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faculty_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facultySessions', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['facultyPayments', tuitionId] });
      toast.success('Entry deleted');
    },
    onError: () => toast.error('Could not delete the entry'),
  });
}

/* ---------------- salary payments ---------------- */

export function useFacultyPaymentsQuery(tuitionId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['facultyPayments', tuitionId, from, to],
    queryFn: async (): Promise<FacultyPayment[]> => {
      if (!tuitionId) return [];
      const { data, error } = await supabase
        .from('faculty_payments')
        .select('id, faculty_id, session_id, salary_month, amount, payment_date, payment_method, payment_reference, notes')
        .eq('tuition_id', tuitionId)
        .gte('payment_date', from)
        .lte('payment_date', to)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((p) => ({
        id: p.id,
        facultyId: p.faculty_id,
        sessionId: p.session_id,
        salaryMonth: p.salary_month,
        amount: Number(p.amount) || 0,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        paymentReference: p.payment_reference,
        notes: p.notes,
      }));
    },
    enabled: !!tuitionId,
    staleTime: 60 * 1000,
  });
}

export function useRecordFacultyPaymentMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      facultyId: string;
      amount: number;
      paymentDate: string;
      paymentMethod?: string | null;
      paymentReference?: string | null;
      notes?: string | null;
      sessionId?: string | null;
      salaryMonth?: string | null;
    }) => {
      if (!tuitionId) throw new Error('No tuition');
      if (!input.amount || input.amount <= 0) throw new Error('Amount must be greater than zero');
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('faculty_payments').insert({
        tuition_id: tuitionId,
        faculty_id: input.facultyId,
        amount: input.amount,
        payment_date: input.paymentDate,
        payment_method: input.paymentMethod || null,
        payment_reference: input.paymentReference || null,
        notes: input.notes || null,
        session_id: input.sessionId || null,
        salary_month: input.salaryMonth || null,
        created_by: userData?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facultyPayments', tuitionId] });
      toast.success('Payment recorded');
    },
    onError: (e: any) => {
      console.error('faculty payment failed', e);
      toast.error(e?.message || 'Could not record the payment');
    },
  });
}

export function useDeleteFacultyPaymentMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faculty_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facultyPayments', tuitionId] });
      toast.success('Payment removed');
    },
    onError: () => toast.error('Could not remove the payment'),
  });
}
