import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAddRoomMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, capacity, description }: { name: string; capacity?: number; description?: string }) => {
      if (!tuitionId) throw new Error('No tuition ID');
      const { error } = await supabase.from('rooms').insert({ name, capacity, description, tuition_id: tuitionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', tuitionId] });
      toast.success('Room added successfully');
    },
    onError: (error) => {
      console.error('Error adding room:', error);
      toast.error('Failed to add room');
    },
  });
}

export function useUpdateRoomMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, capacity, description }: { id: string; name: string; capacity?: number; description?: string }) => {
      const { error } = await supabase.from('rooms').update({ name, capacity, description, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', tuitionId] });
      toast.success('Room updated successfully');
    },
    onError: (error) => {
      console.error('Error updating room:', error);
      toast.error('Failed to update room');
    },
  });
}

export function useDeleteRoomMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', tuitionId] });
      toast.success('Room deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room');
    },
  });
}
