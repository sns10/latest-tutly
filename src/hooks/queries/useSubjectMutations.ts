import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassName } from '@/types';
import { toast } from 'sonner';

export function useAddSubjectMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, classValue }: { name: string; classValue: ClassName }) => {
      if (!tuitionId) throw new Error('No tuition ID');
      const { error } = await supabase.from('subjects').insert({ name, class: classValue, tuition_id: tuitionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', tuitionId] });
      toast.success('Subject added successfully');
    },
    onError: (error) => {
      console.error('Error adding subject:', error);
      toast.error('Failed to add subject');
    },
  });
}

export function useUpdateSubjectMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, classValue }: { id: string; name: string; classValue: ClassName }) => {
      const { error } = await supabase.from('subjects').update({ name, class: classValue }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', tuitionId] });
      toast.success('Subject updated successfully');
    },
    onError: (error) => {
      console.error('Error updating subject:', error);
      toast.error('Failed to update subject');
    },
  });
}

export function useDeleteSubjectMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', tuitionId] });
      toast.success('Subject deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    },
  });
}
