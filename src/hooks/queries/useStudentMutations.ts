import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassName, TeamName, Division } from '@/types';
import { toast } from 'sonner';

interface StudentUpdates {
  name?: string;
  class?: ClassName;
  divisionId?: string | null;
  email?: string | null;
  phone?: string | null;
  rollNo?: number | null;
  dateOfBirth?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  fatherPhone?: string | null;
  motherPhone?: string | null;
  address?: string | null;
  schoolName?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
}

export function useUpdateStudentMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, updates }: { studentId: string; updates: StudentUpdates }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.class !== undefined) updateData.class = updates.class;
      if (updates.divisionId !== undefined) updateData.division_id = updates.divisionId;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.rollNo !== undefined) updateData.roll_no = updates.rollNo;
      if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth;
      if (updates.parentName !== undefined) updateData.parent_name = updates.parentName;
      if (updates.parentPhone !== undefined) updateData.parent_phone = updates.parentPhone;
      if (updates.fatherPhone !== undefined) updateData.father_phone = updates.fatherPhone;
      if (updates.motherPhone !== undefined) updateData.mother_phone = updates.motherPhone;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.schoolName !== undefined) updateData.school_name = updates.schoolName;
      if (updates.gender !== undefined) updateData.gender = updates.gender;

      const { error } = await supabase.from('students').update(updateData).eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success('Student updated successfully');
    },
    onError: (error) => {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    },
  });
}

export function useAssignStudentEmailMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, email }: { studentId: string; email: string }) => {
      const { error } = await supabase.from('students').update({ email }).eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
    },
    onError: (error) => {
      console.error('Error assigning student email:', error);
      toast.error('Failed to assign email');
    },
  });
}

export function useAssignTeamMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, team }: { studentId: string; team: TeamName | null }) => {
      const { error } = await supabase.from('students').update({ team }).eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
    },
    onError: (error) => {
      console.error('Error assigning team:', error);
      toast.error('Failed to assign team');
    },
  });
}

export function useUpdateStudentDivisionMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, divisionId }: { studentId: string; divisionId: string | null }) => {
      const { error } = await supabase.from('students').update({ division_id: divisionId }).eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success('Student division updated successfully');
    },
    onError: (error) => {
      console.error('Error updating student division:', error);
      toast.error('Failed to update student division');
    },
  });
}
