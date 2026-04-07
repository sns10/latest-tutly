/**
 * DEPRECATED — Thin facade for backward compatibility.
 * New code should import domain hooks directly from '@/hooks/queries'.
 */
import { useUserTuition } from './useUserTuition';
import {
  useStudentsQuery,
  useAddStudentMutation,
  useRemoveStudentMutation,
  useDivisionsQuery,
  useSubjectsQuery,
  useFacultyQuery,
  useRoomsQuery,
  useTimetableQuery,
  useChallengesQuery,
  useAnnouncementsQuery,
  useStudentChallengesQuery,
  useAttendanceQuery,
  useMarkAttendanceMutation,
  useBulkMarkAttendanceMutation,
  useFeesQuery,
  useClassFeesQuery,
  useWeeklyTestsQuery,
  useTestResultsQuery,
} from './queries';

export function useSupabaseData() {
  const { tuitionId } = useUserTuition();

  const { data: students = [], isLoading: studentsLoading } = useStudentsQuery(tuitionId);
  const { data: divisions = [], isLoading: divisionsLoading } = useDivisionsQuery(tuitionId);
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectsQuery(tuitionId);
  const { data: faculty = [], isLoading: facultyLoading } = useFacultyQuery(tuitionId);
  const { data: rooms = [] } = useRoomsQuery(tuitionId);
  const { data: timetable = [] } = useTimetableQuery(tuitionId);
  const { data: challenges = [] } = useChallengesQuery(tuitionId);
  const { data: announcements = [] } = useAnnouncementsQuery(tuitionId);
  const { data: studentChallenges = [] } = useStudentChallengesQuery(tuitionId);
  const { data: attendance = [] } = useAttendanceQuery(tuitionId);
  const { data: fees = [] } = useFeesQuery(tuitionId);
  const { data: classFees = [] } = useClassFeesQuery(tuitionId);
  const { data: weeklyTests = [] } = useWeeklyTestsQuery(tuitionId);
  const { data: testResults = [] } = useTestResultsQuery(tuitionId);

  const loading = studentsLoading || divisionsLoading || subjectsLoading || facultyLoading;

  return {
    students, weeklyTests, testResults, challenges, studentChallenges, announcements,
    attendance, fees, classFees, faculty, subjects, timetable, divisions, rooms, loading,
    tuitionId,
  };
}
