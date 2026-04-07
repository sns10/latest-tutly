import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { XPCategory } from '@/types';
import { toast } from 'sonner';

export function useAddXpMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, category, amount }: { studentId: string; category: XPCategory; amount: number }) => {
      const { data: currentXpData, error: fetchError } = await supabase
        .from('student_xp')
        .select('amount')
        .eq('student_id', studentId)
        .eq('category', category)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const newAmount = (currentXpData?.amount || 0) + amount;
      const { error: xpError } = await supabase
        .from('student_xp')
        .upsert({ student_id: studentId, category, amount: newAmount }, { onConflict: 'student_id,category' });

      if (xpError) throw xpError;

      const { data: studentData } = await supabase.from('students').select('total_xp').eq('id', studentId).single();
      const newTotalXp = (studentData?.total_xp || 0) + amount;
      await supabase.from('students').update({ total_xp: newTotalXp }).eq('id', studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
    },
    onError: (error) => {
      console.error('Error updating XP:', error);
      toast.error('Failed to update XP');
    },
  });
}

export function useReduceXpMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, amount, studentName }: { studentId: string; amount: number; studentName?: string }) => {
      const { data: studentData, error: fetchError } = await supabase.from('students').select('total_xp').eq('id', studentId).single();
      if (fetchError) throw fetchError;

      const newTotalXp = Math.max(0, (studentData?.total_xp || 0) - amount);
      const { error } = await supabase.from('students').update({ total_xp: newTotalXp }).eq('id', studentId);
      if (error) throw error;

      return { studentName, amount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      if (data?.studentName) toast.success(`${data.studentName} lost -${data.amount} XP`);
    },
    onError: (error) => {
      console.error('Error reducing XP:', error);
      toast.error('Failed to reduce XP');
    },
  });
}

export function useAwardXpMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, amount, reason, studentName }: { studentId: string; amount: number; reason: string; studentName?: string }) => {
      const { data: studentData, error: fetchError } = await supabase.from('students').select('total_xp').eq('id', studentId).single();
      if (fetchError) throw fetchError;

      const newTotalXp = (studentData?.total_xp || 0) + amount;
      const { error } = await supabase.from('students').update({ total_xp: newTotalXp }).eq('id', studentId);
      if (error) throw error;

      return { studentName, amount, reason };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      if (data?.studentName) toast.success(`${data.studentName} earned +${data.amount} XP! (${data.reason})`);
    },
    onError: (error) => {
      console.error('Error awarding XP:', error);
      toast.error('Failed to award XP');
    },
  });
}

export function useBuyRewardMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, reward, currentXp }: { studentId: string; reward: { id: string; name: string; cost: number }; currentXp: number }) => {
      if (currentXp < reward.cost) throw new Error('Insufficient XP');

      const { error: xpError } = await supabase.from('students').update({ total_xp: currentXp - reward.cost }).eq('id', studentId);
      if (xpError) throw xpError;

      const { error: rewardError } = await supabase.from('student_rewards').insert({ student_id: studentId, reward_id: reward.id });
      if (rewardError) throw rewardError;

      return reward.name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success(`${name} purchased!`);
    },
    onError: (error) => {
      console.error('Error purchasing reward:', error);
      toast.error(error.message === 'Insufficient XP' ? 'Insufficient XP' : 'Failed to purchase reward');
    },
  });
}

export function useUseRewardMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardInstanceId: string) => {
      const { error } = await supabase.from('student_rewards').delete().eq('id', rewardInstanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success('Reward used!');
    },
    onError: (error) => {
      console.error('Error using reward:', error);
      toast.error('Failed to use reward');
    },
  });
}
