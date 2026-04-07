import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassName } from '@/types';
import { toast } from 'sonner';

export function useAddDivisionMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classValue, name }: { classValue: ClassName; name: string }) => {
      if (!tuitionId) throw new Error('No tuition ID');
      const { error } = await supabase.from('divisions').insert({
        class: classValue,
        name: name.trim(),
        tuition_id: tuitionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions', tuitionId] });
      toast.success('Division added successfully');
    },
    onError: (error) => {
      console.error('Error adding division:', error);
      toast.error('Failed to add division');
    },
  });
}

export function useUpdateDivisionMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('divisions').update({ name: name.trim() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success('Division updated successfully');
    },
    onError: (error) => {
      console.error('Error updating division:', error);
      toast.error('Failed to update division');
    },
  });
}

export function useDeleteDivisionMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('divisions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions', tuitionId] });
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success('Division deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting division:', error);
      toast.error('Failed to delete division. Make sure no students are assigned to it.');
    },
  });
}
