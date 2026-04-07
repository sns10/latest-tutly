import { useUserTuition } from '@/hooks/useUserTuition';
import {
  useStudentsQuery,
  useDivisionsQuery,
  useSubjectsQuery,
  useFacultyQuery,
  useAttendanceQuery,
  useFeesQuery,
  useWeeklyTestsQuery,
  useTestResultsQuery,
  useAddStudentMutation,
  useRemoveStudentMutation,
} from '@/hooks/queries';
import { useAddXpMutation, useReduceXpMutation, useBuyRewardMutation, useUseRewardMutation } from '@/hooks/queries/useXpMutations';
import { useAssignTeamMutation } from '@/hooks/queries/useStudentMutations';
import { Leaderboard as LeaderboardComponent } from '@/components/Leaderboard';
import { Student, TeamName, XPCategory } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LeaderboardPage() {
  const { tuitionId } = useUserTuition();

  const { data: students = [], isLoading: studentsLoading } = useStudentsQuery(tuitionId);
  const { data: divisions = [] } = useDivisionsQuery(tuitionId);
  const { data: attendance = [] } = useAttendanceQuery(tuitionId);
  const { data: subjects = [] } = useSubjectsQuery(tuitionId);
  const { data: faculty = [] } = useFacultyQuery(tuitionId);
  const { data: weeklyTests = [] } = useWeeklyTestsQuery(tuitionId);
  const { data: testResults = [] } = useTestResultsQuery(tuitionId);
  const { data: fees = [] } = useFeesQuery(tuitionId);

  const addStudentMut = useAddStudentMutation(tuitionId);
  const removeStudentMut = useRemoveStudentMutation(tuitionId);
  const addXpMut = useAddXpMutation(tuitionId);
  const reduceXpMut = useReduceXpMutation(tuitionId);
  const buyRewardMut = useBuyRewardMutation(tuitionId);
  const useRewardMut = useUseRewardMutation(tuitionId);
  const assignTeamMut = useAssignTeamMutation(tuitionId);

  const addStudent = (newStudent: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => {
    addStudentMut.mutate({
      name: newStudent.name,
      class: newStudent.class,
      divisionId: newStudent.divisionId,
      avatar: newStudent.avatar,
      rollNo: newStudent.rollNo,
      phone: newStudent.phone,
      dateOfBirth: newStudent.dateOfBirth,
      parentName: newStudent.parentName,
      parentPhone: newStudent.fatherPhone || newStudent.parentPhone,
      address: newStudent.address,
      gender: newStudent.gender,
      email: newStudent.email,
    });
  };

  const addXp = (studentId: string, category: XPCategory, amount: number) => {
    addXpMut.mutate({ studentId, category, amount });
  };

  const reduceXp = (studentId: string, amount: number) => {
    const student = students.find(s => s.id === studentId);
    reduceXpMut.mutate({ studentId, amount, studentName: student?.name });
  };

  const buyReward = (studentId: string, reward: any) => {
    const student = students.find(s => s.id === studentId);
    if (!student) { toast.error('Student not found'); return; }
    buyRewardMut.mutate({ studentId, reward, currentXp: student.totalXp });
  };

  const useReward = (_studentId: string, rewardInstanceId: string) => {
    useRewardMut.mutate(rewardInstanceId);
  };

  const assignTeam = (studentId: string, team: TeamName | null) => {
    assignTeamMut.mutate({ studentId, team });
  };

  if (studentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6">
      <LeaderboardComponent
        students={students}
        divisions={divisions}
        attendance={attendance}
        testResults={testResults}
        weeklyTests={weeklyTests}
        fees={fees}
        subjects={subjects}
        faculty={faculty}
        onAddStudent={addStudent}
        onAddXp={addXp}
        onReduceXp={reduceXp}
        onRemoveStudent={(id: string) => removeStudentMut.mutate(id)}
        onBuyReward={buyReward}
        onUseReward={useReward}
        onAssignTeam={assignTeam}
      />
    </div>
  );
}
