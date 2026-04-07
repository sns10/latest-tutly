import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassName } from '@/types';
import { toast } from 'sonner';

interface TimetableEntryParams {
  classValue: ClassName;
  subjectId: string;
  facultyId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: 'regular' | 'special';
  roomId?: string;
  roomNumber?: string;
  specificDate?: string;
  startDate?: string;
  endDate?: string;
  eventType?: string;
  notes?: string;
  divisionId?: string;
}

export function useAddTimetableEntryMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TimetableEntryParams) => {
      if (!tuitionId) throw new Error('No tuition ID');

      const { error } = await supabase.from('timetable').insert({
        class: params.classValue,
        division_id: params.divisionId || null,
        subject_id: params.subjectId,
        faculty_id: params.facultyId,
        day_of_week: params.dayOfWeek,
        start_time: params.startTime,
        end_time: params.endTime,
        type: params.type,
        room_id: params.roomId,
        room_number: params.roomNumber,
        specific_date: params.specificDate,
        start_date: params.startDate,
        end_date: params.endDate,
        event_type: params.eventType,
        notes: params.notes,
        tuition_id: tuitionId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', tuitionId] });
      toast.success('Timetable entry added successfully');
    },
    onError: (error) => {
      console.error('Error adding timetable entry:', error);
      toast.error('Failed to add timetable entry');
    },
  });
}

export function useUpdateTimetableEntryMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...params }: TimetableEntryParams & { id: string }) => {
      const { error } = await supabase.from('timetable').update({
        class: params.classValue,
        division_id: params.divisionId || null,
        subject_id: params.subjectId,
        faculty_id: params.facultyId,
        day_of_week: params.dayOfWeek,
        start_time: params.startTime,
        end_time: params.endTime,
        type: params.type,
        room_id: params.roomId,
        room_number: params.roomNumber,
        specific_date: params.specificDate,
        start_date: params.startDate,
        end_date: params.endDate,
        event_type: params.eventType,
        notes: params.notes,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', tuitionId] });
      toast.success('Timetable entry updated successfully');
    },
    onError: (error) => {
      console.error('Error updating timetable entry:', error);
      toast.error('Failed to update timetable entry');
    },
  });
}

export function useDeleteTimetableEntryMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('timetable').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', tuitionId] });
      toast.success('Timetable entry deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting timetable entry:', error);
      toast.error('Failed to delete timetable entry');
    },
  });
}
