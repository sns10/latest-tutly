import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Challenge } from '@/types';
import { toast } from 'sonner';

export function useAddChallengeMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newChallenge: Omit<Challenge, 'id' | 'createdAt'>) => {
      if (!tuitionId) throw new Error('No tuition ID');

      const { error } = await supabase.from('challenges').insert([{
        title: newChallenge.title,
        description: newChallenge.description,
        type: newChallenge.type,
        xp_reward: newChallenge.xpReward,
        difficulty: newChallenge.difficulty || 'medium',
        start_date: newChallenge.startDate,
        end_date: newChallenge.endDate,
        is_active: newChallenge.isActive,
        tuition_id: tuitionId,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['studentChallenges', tuitionId] });
      toast.success('Challenge created successfully!');
    },
    onError: (error) => {
      console.error('Error adding challenge:', error);
      toast.error('Failed to create challenge');
    },
  });
}

export function useCompleteChallengeMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, challengeId, xpReward, challengeTitle }: { 
      studentId: string; 
      challengeId: string; 
      xpReward: number; 
      challengeTitle: string;
    }) => {
      const { error } = await supabase.from('student_challenges').insert({
        student_id: studentId,
        challenge_id: challengeId,
        status: 'completed',
      });

      if (error) throw error;

      // Award XP
      const { data: studentData } = await supabase.from('students').select('total_xp, name').eq('id', studentId).single();
      if (studentData) {
        const newTotalXp = (studentData.total_xp || 0) + xpReward;
        await supabase.from('students').update({ total_xp: newTotalXp }).eq('id', studentId);
        return { studentName: studentData.name, xpReward, challengeTitle };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenges', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['studentChallenges', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      if (data) toast.success(`${data.studentName} earned +${data.xpReward} XP! (Completed challenge: ${data.challengeTitle})`);
    },
    onError: (error) => {
      console.error('Error completing challenge:', error);
      toast.error('Failed to complete challenge');
    },
  });
}
