import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, ClassName, TeamName } from '@/types';
import { BADGE_DEFINITIONS } from '@/config/badges';
import { XP_STORE_ITEMS } from '@/config/rewards';
import { toast } from 'sonner';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

const formatStudents = (studentsData: any[]): Student[] => {
  const formattedStudents: Student[] = studentsData.map(student => ({
    id: student.id,
    name: student.name,
    class: student.class as ClassName,
    divisionId: student.division_id,
    division: student.division ? {
      id: student.division.id,
      class: student.division.class as ClassName,
      name: student.division.name,
      createdAt: new Date().toISOString(),
    } : undefined,
    tuitionId: student.tuition_id,
    avatar: student.avatar || '',
    email: student.email || undefined,
    rollNo: student.roll_no || undefined,
    phone: student.phone || undefined,
    dateOfBirth: student.date_of_birth || undefined,
    parentName: student.parent_name || undefined,
    parentPhone: student.parent_phone || undefined,
    address: student.address || undefined,
    gender: student.gender || undefined,
    team: student.team as TeamName | null,
    totalXp: student.total_xp,
    xp: {
      blackout: student.student_xp?.find((x: any) => x.category === 'blackout')?.amount || 0,
      futureMe: student.student_xp?.find((x: any) => x.category === 'futureMe')?.amount || 0,
      recallWar: student.student_xp?.find((x: any) => x.category === 'recallWar')?.amount || 0,
    },
    badges: student.student_badges?.map((sb: any) => {
      const badgeDef = BADGE_DEFINITIONS.find(b => b.id === sb.badge_id);
      return {
        id: sb.badge_id,
        name: badgeDef?.name || '',
        description: badgeDef?.description || '',
        emoji: badgeDef?.emoji || '',
        dateEarned: sb.earned_at,
      };
    }) || [],
    purchasedRewards: student.student_rewards?.map((sr: any) => {
      const rewardDef = XP_STORE_ITEMS.find(r => r.id === sr.reward_id);
      return {
        id: sr.reward_id,
        instanceId: sr.id || `${sr.reward_id}-${sr.purchased_at}`,
        name: rewardDef?.name || '',
        cost: rewardDef?.cost || 0,
        description: rewardDef?.description || '',
        emoji: rewardDef?.emoji || '',
      };
    }) || [],
  }));

  // Sort by roll number
  formattedStudents.sort((a, b) => {
    if (a.rollNo && b.rollNo) return a.rollNo - b.rollNo;
    if (a.rollNo && !b.rollNo) return -1;
    if (!a.rollNo && b.rollNo) return 1;
    return a.name.localeCompare(b.name);
  });

  return formattedStudents;
};

export function useStudentsQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['students', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          student_xp (category, amount),
          student_badges (badge_id, earned_at),
          student_rewards (reward_id, purchased_at),
          division:divisions (id, class, name)
        `);

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }

      return formatStudents(data || []);
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useAddStudentMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStudent: { 
      name: string; 
      class: ClassName; 
      divisionId?: string; 
      avatar?: string; 
      rollNo?: number;
      phone?: string;
      dateOfBirth?: string;
      parentName?: string;
      parentPhone?: string;
      address?: string;
      gender?: string;
      email?: string;
    }) => {
      if (!tuitionId) throw new Error('No tuition ID');

      const { data, error } = await supabase
        .from('students')
        .insert({
          name: newStudent.name,
          class: newStudent.class,
          division_id: newStudent.divisionId,
          avatar: newStudent.avatar,
          tuition_id: tuitionId,
          roll_no: newStudent.rollNo,
          phone: newStudent.phone,
          date_of_birth: newStudent.dateOfBirth,
          parent_name: newStudent.parentName,
          parent_phone: newStudent.parentPhone,
          address: newStudent.address,
          gender: newStudent.gender,
          email: newStudent.email,
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize XP
      await supabase.from('student_xp').insert([
        { student_id: data.id, category: 'blackout', amount: 0 },
        { student_id: data.id, category: 'futureMe', amount: 0 },
        { student_id: data.id, category: 'recallWar', amount: 0 },
      ]);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success('Student added successfully!');
    },
    onError: (error) => {
      console.error('Error adding student:', error);
      toast.error('Failed to add student');
    },
  });
}

export function useRemoveStudentMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
      toast.success('Student removed successfully');
    },
    onError: (error) => {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
    },
  });
}
