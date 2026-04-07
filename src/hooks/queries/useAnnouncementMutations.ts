import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Announcement } from '@/types';
import { toast } from 'sonner';

export function useAddAnnouncementMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAnnouncement: Omit<Announcement, 'id' | 'publishedAt'>) => {
      if (!tuitionId) throw new Error('No tuition ID');

      const { error } = await supabase.from('announcements').insert({
        title: newAnnouncement.title,
        body: newAnnouncement.body,
        created_by: newAnnouncement.createdBy,
        target_class: newAnnouncement.targetClass,
        xp_bonus: newAnnouncement.xpBonus,
        tuition_id: tuitionId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tuitionId] });
      toast.success('Announcement created successfully!');
    },
    onError: (error) => {
      console.error('Error adding announcement:', error);
      toast.error('Failed to create announcement');
    },
  });
}
