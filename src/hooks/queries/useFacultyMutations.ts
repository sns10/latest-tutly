import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAddFacultyMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email, phone, subjectIds }: { name: string; email: string; phone: string; subjectIds: string[] }) => {
      if (!tuitionId) throw new Error('No tuition ID');

      const { data: facultyData, error: facultyError } = await supabase
        .from('faculty')
        .insert({ name, email, phone, tuition_id: tuitionId })
        .select()
        .single();

      if (facultyError) throw facultyError;

      if (subjectIds.length > 0) {
        await supabase.from('faculty_subjects').insert(subjectIds.map(subjectId => ({
          faculty_id: facultyData.id,
          subject_id: subjectId,
        })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', tuitionId] });
      toast.success('Faculty added successfully');
    },
    onError: (error) => {
      console.error('Error adding faculty:', error);
      toast.error('Failed to add faculty');
    },
  });
}

export function useUpdateFacultyMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, email, phone, subjectIds }: { id: string; name: string; email: string; phone: string; subjectIds: string[] }) => {
      const { error: updateError } = await supabase
        .from('faculty')
        .update({ name, email, phone, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      await supabase.from('faculty_subjects').delete().eq('faculty_id', id);
      if (subjectIds.length > 0) {
        await supabase.from('faculty_subjects').insert(subjectIds.map(subjectId => ({
          faculty_id: id,
          subject_id: subjectId,
        })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', tuitionId] });
      toast.success('Faculty updated successfully');
    },
    onError: (error) => {
      console.error('Error updating faculty:', error);
      toast.error('Failed to update faculty');
    },
  });
}

export function useDeleteFacultyMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faculty').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', tuitionId] });
      toast.success('Faculty deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting faculty:', error);
      toast.error('Failed to delete faculty');
    },
  });
}
