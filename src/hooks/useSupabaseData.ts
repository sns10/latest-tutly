import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, WeeklyTest, StudentTestResult, ClassName, TeamName, XPCategory, Challenge, Announcement, StudentFee } from '@/types';
import { toast } from 'sonner';
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

// Domain mutation hooks
import { useUpdateStudentMutation, useAssignStudentEmailMutation, useAssignTeamMutation, useUpdateStudentDivisionMutation } from './queries/useStudentMutations';
import { useAddXpMutation, useReduceXpMutation, useAwardXpMutation, useBuyRewardMutation, useUseRewardMutation } from './queries/useXpMutations';
import { useAddFeesBatchMutation } from './queries/useFeesMutations';
import { useAddChallengeMutation, useCompleteChallengeMutation } from './queries/useChallengeMutations';
import { useAddAnnouncementMutation } from './queries/useAnnouncementMutations';
import { useAddFacultyMutation, useUpdateFacultyMutation, useDeleteFacultyMutation } from './queries/useFacultyMutations';
import { useAddSubjectMutation, useUpdateSubjectMutation, useDeleteSubjectMutation } from './queries/useSubjectMutations';
import { useAddTimetableEntryMutation, useUpdateTimetableEntryMutation, useDeleteTimetableEntryMutation } from './queries/useTimetableMutations';
import { useAddDivisionMutation, useUpdateDivisionMutation, useDeleteDivisionMutation } from './queries/useDivisionMutations';
import { useAddRoomMutation, useUpdateRoomMutation, useDeleteRoomMutation } from './queries/useRoomMutations';

/**
 * Facade hook — re-exports domain hooks for backward compatibility.
 * New code should import domain hooks directly instead of using this.
 */
export function useSupabaseData() {
  const { tuitionId } = useUserTuition();
  const queryClient = useQueryClient();

  // ─── Queries ───
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

  // ─── Student Mutations ───
  const addStudentMut = useAddStudentMutation(tuitionId);
  const removeStudentMut = useRemoveStudentMutation(tuitionId);
  const updateStudentMut = useUpdateStudentMutation(tuitionId);
  const assignEmailMut = useAssignStudentEmailMutation(tuitionId);
  const assignTeamMut = useAssignTeamMutation(tuitionId);
  const updateStudentDivMut = useUpdateStudentDivisionMutation(tuitionId);

  // ─── XP Mutations ───
  const addXpMut = useAddXpMutation(tuitionId);
  const reduceXpMut = useReduceXpMutation(tuitionId);
  const awardXpMut = useAwardXpMutation(tuitionId);
  const buyRewardMut = useBuyRewardMutation(tuitionId);
  const useRewardMut = useUseRewardMutation(tuitionId);

  // ─── Fee Mutations ───
  const addFeesBatchMut = useAddFeesBatchMutation(tuitionId);

  // ─── Challenge Mutations ───
  const addChallengeMut = useAddChallengeMutation(tuitionId);
  const completeChallengeMut = useCompleteChallengeMutation(tuitionId);

  // ─── Announcement Mutations ───
  const addAnnouncementMut = useAddAnnouncementMutation(tuitionId);

  // ─── Faculty Mutations ───
  const addFacultyMut = useAddFacultyMutation(tuitionId);
  const updateFacultyMut = useUpdateFacultyMutation(tuitionId);
  const deleteFacultyMut = useDeleteFacultyMutation(tuitionId);

  // ─── Subject Mutations ───
  const addSubjectMut = useAddSubjectMutation(tuitionId);
  const updateSubjectMut = useUpdateSubjectMutation(tuitionId);
  const deleteSubjectMut = useDeleteSubjectMutation(tuitionId);

  // ─── Timetable Mutations ───
  const addTimetableMut = useAddTimetableEntryMutation(tuitionId);
  const updateTimetableMut = useUpdateTimetableEntryMutation(tuitionId);
  const deleteTimetableMut = useDeleteTimetableEntryMutation(tuitionId);

  // ─── Division Mutations ───
  const addDivisionMut = useAddDivisionMutation(tuitionId);
  const updateDivisionMut = useUpdateDivisionMutation(tuitionId);
  const deleteDivisionMut = useDeleteDivisionMutation(tuitionId);

  // ─── Room Mutations ───
  const addRoomMut = useAddRoomMutation(tuitionId);
  const updateRoomMut = useUpdateRoomMutation(tuitionId);
  const deleteRoomMut = useDeleteRoomMutation(tuitionId);

  // ─── Attendance ───
  const markAttendanceMutation = useMarkAttendanceMutation(tuitionId);
  const bulkMarkAttendanceMutation = useBulkMarkAttendanceMutation(tuitionId);

  const markAttendance = useCallback((
    studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused',
    notes?: string, subjectId?: string, facultyId?: string
  ) => {
    markAttendanceMutation.mutate({ studentId, date, status, notes, subjectId, facultyId });
  }, [markAttendanceMutation]);

  const bulkMarkAttendance = useCallback((
    records: Array<{ studentId: string; date: string; status: 'present' | 'absent' | 'late' | 'excused'; notes?: string; subjectId?: string; facultyId?: string }>
  ) => {
    bulkMarkAttendanceMutation.mutate(records);
  }, [bulkMarkAttendanceMutation]);

  // ─── Invalidation helpers for raw async wrappers ───
  const invalidateFees = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
    queryClient.invalidateQueries({ queryKey: ['classFees', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateTests = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['weeklyTests', tuitionId] });
    queryClient.invalidateQueries({ queryKey: ['testResults', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateStudents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateDivisions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['divisions', tuitionId] });
  }, [queryClient, tuitionId]);

  // ─── Wrapper functions for backward compatibility ───
  // These adapt the old function signatures to the new mutation hooks.

  const addStudent = async (newStudent: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => {
    let divisionIdToUse = newStudent.divisionId;

    if (!divisionIdToUse || divisionIdToUse === 'none') {
      const existingDivisionA = divisions.find(d => d.class === newStudent.class && d.name === 'A');
      if (existingDivisionA) {
        divisionIdToUse = existingDivisionA.id;
      } else {
        const { data: newDivision, error: divError } = await supabase
          .from('divisions')
          .insert({ class: newStudent.class, name: 'A', tuition_id: tuitionId! })
          .select()
          .single();
        if (divError) {
          console.error('Error creating default division:', divError);
        } else {
          divisionIdToUse = newDivision.id;
          invalidateDivisions();
        }
      }
    }

    let rollNoToUse = newStudent.rollNo;
    if (!rollNoToUse) {
      const existingStudents = students.filter(s => s.class === newStudent.class && s.divisionId === divisionIdToUse);
      const maxRollNo = existingStudents.reduce((max, s) => Math.max(max, s.rollNo || 0), 0);
      rollNoToUse = maxRollNo + 1;
    }

    addStudentMut.mutate({
      name: newStudent.name,
      class: newStudent.class,
      divisionId: divisionIdToUse,
      avatar: newStudent.avatar,
      rollNo: rollNoToUse,
      phone: newStudent.phone,
      dateOfBirth: newStudent.dateOfBirth,
      parentName: newStudent.parentName,
      parentPhone: newStudent.fatherPhone || newStudent.parentPhone,
      address: newStudent.address,
      gender: newStudent.gender,
      email: newStudent.email,
    });
  };

  const removeStudent = async (studentId: string) => {
    removeStudentMut.mutate(studentId);
  };

  const updateStudent = async (studentId: string, updates: Parameters<typeof updateStudentMut.mutate>[0]['updates']) => {
    updateStudentMut.mutate({ studentId, updates });
  };

  const assignStudentEmail = async (studentId: string, email: string): Promise<boolean> => {
    try {
      await assignEmailMut.mutateAsync({ studentId, email });
      return true;
    } catch {
      return false;
    }
  };

  const assignTeam = async (studentId: string, team: TeamName | null) => {
    assignTeamMut.mutate({ studentId, team });
  };

  const updateStudentDivision = async (studentId: string, divisionId: string | null) => {
    updateStudentDivMut.mutate({ studentId, divisionId });
  };

  const addXp = async (studentId: string, category: XPCategory, amount: number) => {
    addXpMut.mutate({ studentId, category, amount });
  };

  const reduceXp = async (studentId: string, amount: number) => {
    const student = students.find(s => s.id === studentId);
    reduceXpMut.mutate({ studentId, amount, studentName: student?.name });
  };

  const awardXP = async (studentId: string, amount: number, reason: string) => {
    const student = students.find(s => s.id === studentId);
    awardXpMut.mutate({ studentId, amount, reason, studentName: student?.name });
  };

  const buyReward = async (studentId: string, reward: any) => {
    const student = students.find(s => s.id === studentId);
    if (!student) { toast.error('Student not found'); return; }
    buyRewardMut.mutate({ studentId, reward, currentXp: student.totalXp });
  };

  const useReward = async (_studentId: string, rewardInstanceId: string) => {
    useRewardMut.mutate(rewardInstanceId);
  };

  // Test operations — kept as raw async for return-value compatibility
  const addWeeklyTest = async (newTest: Omit<WeeklyTest, 'id'>) => {
    const { error } = await supabase.from('weekly_tests').insert({
      name: newTest.name, subject: newTest.subject, max_marks: newTest.maxMarks,
      test_date: newTest.date, class: newTest.class, tuition_id: tuitionId!,
    });
    if (error) { console.error('Error adding weekly test:', error); toast.error('Failed to create test'); return; }
    invalidateTests();
    toast.success(`Test "${newTest.name}" created successfully!`);
  };

  const deleteWeeklyTest = async (testId: string) => {
    await supabase.from('student_test_results').delete().eq('test_id', testId);
    const { error } = await supabase.from('weekly_tests').delete().eq('id', testId);
    if (error) { console.error('Error deleting test:', error); toast.error('Failed to delete test'); return; }
    invalidateTests();
    toast.success('Test deleted successfully!');
  };

  const addTestResult = async (result: StudentTestResult): Promise<boolean> => {
    const { error } = await supabase.from('student_test_results').upsert({
      test_id: result.testId, student_id: result.studentId, marks: result.marks,
    }, { onConflict: 'test_id,student_id' });
    if (error) { console.error('Error adding test result:', error); toast.error('Failed to save test result'); return false; }
    invalidateTests();
    return true;
  };

  const addTestResultsBatch = async (results: StudentTestResult[]): Promise<boolean> => {
    if (results.length === 0) return true;
    const records = results.map(r => ({ test_id: r.testId, student_id: r.studentId, marks: r.marks }));
    const CHUNK_SIZE = 300;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('student_test_results').upsert(chunk, { onConflict: 'test_id,student_id' });
      if (error) { console.error('Error adding test results:', error); toast.error('Failed to save test results.'); return false; }
    }
    invalidateTests();
    toast.success(`Marks saved for ${results.length} students!`);
    return true;
  };

  // Fee operations — kept as raw async for return-value compatibility
  const addFee = async (newFee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { error } = await supabase.from('student_fees').insert({
      student_id: newFee.studentId, fee_type: newFee.feeType, amount: newFee.amount,
      due_date: newFee.dueDate, paid_date: newFee.paidDate || null, status: newFee.status, notes: newFee.notes || null,
    });
    if (error) { console.error('Error adding fee:', error); toast.error('Failed to add fee'); return; }
    invalidateFees();
    toast.success('Fee added successfully!');
  };

  const addFeesBatch = async (newFees: Array<Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>>) => {
    addFeesBatchMut.mutate(newFees);
  };

  const updateFeeStatus = async (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => {
    const { error } = await supabase.from('student_fees').update({ status, paid_date: paidDate || null }).eq('id', feeId);
    if (error) { console.error('Error updating fee status:', error); toast.error('Failed to update fee status'); return; }
    invalidateFees();
  };

  const updateClassFee = async (className: string, amount: number) => {
    if (!tuitionId) { toast.error('Unable to save class fee - no tuition context'); return; }
    const { data: existing } = await supabase.from('class_fees').select('id').eq('class', className).eq('tuition_id', tuitionId).maybeSingle();
    let error;
    if (existing) {
      const result = await supabase.from('class_fees').update({ amount }).eq('id', existing.id);
      error = result.error;
    } else {
      const result = await supabase.from('class_fees').insert({ class: className, amount, tuition_id: tuitionId });
      error = result.error;
    }
    if (error) { console.error('Error updating class fee:', error); toast.error('Failed to update class fee'); return; }
    invalidateFees();
  };

  const deleteFee = async (feeId: string) => {
    await supabase.from('fee_payments').delete().eq('fee_id', feeId);
    const { error } = await supabase.from('student_fees').delete().eq('id', feeId);
    if (error) { console.error('Error deleting fee:', error); toast.error('Failed to delete fee'); return; }
    invalidateFees();
    toast.success('Fee deleted successfully');
  };

  const fetchFees = useCallback(() => { invalidateFees(); }, [invalidateFees]);

  // Challenge wrappers
  const addChallenge = async (newChallenge: Omit<Challenge, 'id' | 'createdAt'>) => {
    addChallengeMut.mutate(newChallenge);
  };

  const completeChallenge = async (studentId: string, challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    completeChallengeMut.mutate({
      studentId,
      challengeId,
      xpReward: challenge?.xpReward || 0,
      challengeTitle: challenge?.title || '',
    });
  };

  // Announcement wrapper
  const addAnnouncement = async (newAnnouncement: Omit<Announcement, 'id' | 'publishedAt'>) => {
    addAnnouncementMut.mutate(newAnnouncement);
  };

  // Faculty wrappers
  const addFaculty = async (name: string, email: string, phone: string, subjectIds: string[]) => {
    addFacultyMut.mutate({ name, email, phone, subjectIds });
  };
  const updateFaculty = async (id: string, name: string, email: string, phone: string, subjectIds: string[]) => {
    updateFacultyMut.mutate({ id, name, email, phone, subjectIds });
  };
  const deleteFaculty = async (id: string) => { deleteFacultyMut.mutate(id); };

  // Subject wrappers
  const addSubject = async (name: string, classValue: ClassName) => {
    addSubjectMut.mutate({ name, classValue });
  };
  const updateSubject = async (id: string, name: string, classValue: ClassName) => {
    updateSubjectMut.mutate({ id, name, classValue });
  };
  const deleteSubject = async (id: string) => { deleteSubjectMut.mutate(id); };

  // Timetable wrappers
  const addTimetableEntry = async (
    classValue: ClassName, subjectId: string, facultyId: string, dayOfWeek: number,
    startTime: string, endTime: string, type: 'regular' | 'special',
    roomId?: string, roomNumber?: string, specificDate?: string, startDate?: string,
    endDate?: string, eventType?: string, notes?: string, divisionId?: string
  ) => {
    addTimetableMut.mutate({ classValue, subjectId, facultyId, dayOfWeek, startTime, endTime, type, roomId, roomNumber, specificDate, startDate, endDate, eventType, notes, divisionId });
  };

  const updateTimetableEntry = async (
    id: string, classValue: ClassName, subjectId: string, facultyId: string, dayOfWeek: number,
    startTime: string, endTime: string, type: 'regular' | 'special',
    roomId?: string, roomNumber?: string, specificDate?: string, startDate?: string,
    endDate?: string, eventType?: string, notes?: string, divisionId?: string
  ) => {
    updateTimetableMut.mutate({ id, classValue, subjectId, facultyId, dayOfWeek, startTime, endTime, type, roomId, roomNumber, specificDate, startDate, endDate, eventType, notes, divisionId });
  };

  const deleteTimetableEntry = async (id: string) => { deleteTimetableMut.mutate(id); };

  // Division wrappers
  const addDivision = async (classValue: ClassName, name: string) => {
    addDivisionMut.mutate({ classValue, name });
  };
  const updateDivision = async (id: string, name: string) => {
    updateDivisionMut.mutate({ id, name });
  };
  const deleteDivision = async (id: string) => { deleteDivisionMut.mutate(id); };

  // Room wrappers
  const addRoom = async (name: string, capacity?: number, description?: string) => {
    addRoomMut.mutate({ name, capacity, description });
  };
  const updateRoom = async (id: string, name: string, capacity?: number, description?: string) => {
    updateRoomMut.mutate({ id, name, capacity, description });
  };
  const deleteRoom = async (id: string) => { deleteRoomMut.mutate(id); };

  return {
    students, weeklyTests, testResults, challenges, studentChallenges, announcements,
    attendance, fees, classFees, faculty, subjects, timetable, divisions, rooms, loading,
    addStudent, addWeeklyTest, deleteWeeklyTest, addTestResult, addTestResultsBatch,
    addXp, reduceXp, awardXP, removeStudent, assignTeam, buyReward, useReward,
    addChallenge, completeChallenge, addAnnouncement, markAttendance, bulkMarkAttendance,
    addFee, addFeesBatch, updateFeeStatus, updateClassFee, addFaculty, updateFaculty,
    deleteFaculty, addSubject, updateSubject, deleteSubject, addTimetableEntry,
    updateTimetableEntry, deleteTimetableEntry, addDivision, updateDivision, deleteDivision,
    updateStudentDivision, addRoom, updateRoom, deleteRoom, updateStudent,
    assignStudentEmail, deleteFee, fetchFees,
  };
}
