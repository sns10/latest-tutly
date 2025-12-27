import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, WeeklyTest, StudentTestResult, ClassName, TeamName, XPCategory, Challenge, StudentChallenge, Announcement, StudentAttendance, StudentFee, ClassFee, Faculty, Subject, Timetable, Division, Room } from '@/types';
import { toast } from 'sonner';
import { useUserTuition } from './useUserTuition';
import {
  useStudentsQuery,
  useDivisionsQuery,
  useSubjectsQuery,
  useFacultyQuery,
  useRoomsQuery,
  useTimetableQuery,
  useChallengesQuery,
  useAnnouncementsQuery,
  useStudentChallengesQuery,
  useAttendanceQuery,
  useFeesQuery,
  useClassFeesQuery,
  useWeeklyTestsQuery,
  useTestResultsQuery,
} from './queries';

export function useSupabaseData() {
  const { tuitionId } = useUserTuition();
  const queryClient = useQueryClient();

  // Core data - loaded immediately with caching
  const { data: students = [], isLoading: studentsLoading } = useStudentsQuery(tuitionId);
  const { data: divisions = [], isLoading: divisionsLoading } = useDivisionsQuery(tuitionId);
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectsQuery(tuitionId);
  const { data: faculty = [], isLoading: facultyLoading } = useFacultyQuery(tuitionId);
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsQuery(tuitionId);
  
  // Less essential data - still loaded but with longer stale times
  const { data: timetable = [] } = useTimetableQuery(tuitionId);
  const { data: challenges = [] } = useChallengesQuery(tuitionId);
  const { data: announcements = [] } = useAnnouncementsQuery(tuitionId);
  const { data: studentChallenges = [] } = useStudentChallengesQuery(tuitionId);
  
  // On-demand data - loaded with filters, shorter cache
  const { data: attendance = [] } = useAttendanceQuery(tuitionId); // Uses 30-day default
  const { data: fees = [] } = useFeesQuery(tuitionId);
  const { data: classFees = [] } = useClassFeesQuery(tuitionId);
  const { data: weeklyTests = [] } = useWeeklyTestsQuery(tuitionId);
  const { data: testResults = [] } = useTestResultsQuery(tuitionId);

  const loading = studentsLoading || divisionsLoading || subjectsLoading || facultyLoading || roomsLoading;

  // Invalidation helpers
  const invalidateStudents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['students', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateAttendance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['attendance', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateFees = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['fees', tuitionId] });
    queryClient.invalidateQueries({ queryKey: ['classFees', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateTests = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['weeklyTests', tuitionId] });
    queryClient.invalidateQueries({ queryKey: ['testResults', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateDivisions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['divisions', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateSubjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['subjects', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateFaculty = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['faculty', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateRooms = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['rooms', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateTimetable = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['timetable', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateChallenges = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['challenges', tuitionId] });
    queryClient.invalidateQueries({ queryKey: ['studentChallenges', tuitionId] });
  }, [queryClient, tuitionId]);

  const invalidateAnnouncements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['announcements', tuitionId] });
  }, [queryClient, tuitionId]);

  // Student operations
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

    const { data, error } = await supabase
      .from('students')
      .insert({
        name: newStudent.name,
        class: newStudent.class,
        division_id: divisionIdToUse,
        avatar: newStudent.avatar,
        tuition_id: tuitionId!,
        roll_no: rollNoToUse,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student');
      return;
    }

    await supabase.from('student_xp').insert([
      { student_id: data.id, category: 'blackout', amount: 0 },
      { student_id: data.id, category: 'futureMe', amount: 0 },
      { student_id: data.id, category: 'recallWar', amount: 0 },
    ]);

    invalidateStudents();
    toast.success('Student added successfully!');
  };

  const removeStudent = async (studentId: string) => {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
      return;
    }
    invalidateStudents();
    toast.success('Student removed successfully');
  };

  const updateStudent = async (studentId: string, updates: { name?: string; class?: ClassName; divisionId?: string | null; email?: string | null }) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.class !== undefined) updateData.class = updates.class;
    if (updates.divisionId !== undefined) updateData.division_id = updates.divisionId;
    if (updates.email !== undefined) updateData.email = updates.email;

    const { error } = await supabase.from('students').update(updateData).eq('id', studentId);
    if (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
      return;
    }
    toast.success('Student updated successfully');
    invalidateStudents();
  };

  const assignStudentEmail = async (studentId: string, email: string): Promise<boolean> => {
    const { error } = await supabase.from('students').update({ email }).eq('id', studentId);
    if (error) {
      console.error('Error assigning student email:', error);
      toast.error('Failed to assign email');
      return false;
    }
    invalidateStudents();
    return true;
  };

  const assignTeam = async (studentId: string, team: TeamName | null) => {
    const { error } = await supabase.from('students').update({ team }).eq('id', studentId);
    if (error) {
      console.error('Error assigning team:', error);
      toast.error('Failed to assign team');
      return;
    }
    invalidateStudents();
  };

  const updateStudentDivision = async (studentId: string, divisionId: string | null) => {
    const { error } = await supabase.from('students').update({ division_id: divisionId }).eq('id', studentId);
    if (error) {
      console.error('Error updating student division:', error);
      toast.error('Failed to update student division');
      return;
    }
    toast.success('Student division updated successfully');
    invalidateStudents();
  };

  // XP operations
  const addXp = async (studentId: string, category: XPCategory, amount: number) => {
    const { data: currentXpData, error: fetchError } = await supabase
      .from('student_xp')
      .select('amount')
      .eq('student_id', studentId)
      .eq('category', category)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching current XP:', fetchError);
      toast.error('Failed to update XP');
      return;
    }

    const newAmount = (currentXpData?.amount || 0) + amount;

    const { error: xpError } = await supabase
      .from('student_xp')
      .upsert({ student_id: studentId, category, amount: newAmount }, { onConflict: 'student_id,category' });

    if (xpError) {
      console.error('Error updating XP:', xpError);
      toast.error('Failed to update XP');
      return;
    }

    const { data: studentData } = await supabase.from('students').select('total_xp').eq('id', studentId).single();
    const newTotalXp = (studentData?.total_xp || 0) + amount;
    await supabase.from('students').update({ total_xp: newTotalXp }).eq('id', studentId);

    invalidateStudents();
  };

  const reduceXp = async (studentId: string, amount: number) => {
    const { data: studentData, error: fetchError } = await supabase.from('students').select('total_xp').eq('id', studentId).single();
    if (fetchError) {
      console.error('Error fetching student:', fetchError);
      toast.error('Failed to reduce XP');
      return;
    }

    const newTotalXp = Math.max(0, (studentData?.total_xp || 0) - amount);
    const { error } = await supabase.from('students').update({ total_xp: newTotalXp }).eq('id', studentId);

    if (error) {
      console.error('Error reducing XP:', error);
      toast.error('Failed to reduce XP');
      return;
    }

    const student = students.find(s => s.id === studentId);
    if (student) toast.success(`${student.name} lost -${amount} XP`);
    invalidateStudents();
  };

  const awardXP = async (studentId: string, amount: number, reason: string) => {
    const { data: studentData, error: fetchError } = await supabase.from('students').select('total_xp').eq('id', studentId).single();
    if (fetchError) {
      console.error('Error fetching student:', fetchError);
      toast.error('Failed to award XP');
      return;
    }

    const newTotalXp = (studentData?.total_xp || 0) + amount;
    const { error } = await supabase.from('students').update({ total_xp: newTotalXp }).eq('id', studentId);

    if (error) {
      console.error('Error awarding XP:', error);
      toast.error('Failed to award XP');
      return;
    }

    const student = students.find(s => s.id === studentId);
    if (student) toast.success(`${student.name} earned +${amount} XP! (${reason})`);
    invalidateStudents();
  };

  const buyReward = async (studentId: string, reward: any) => {
    const student = students.find(s => s.id === studentId);
    if (!student || student.totalXp < reward.cost) {
      toast.error('Insufficient XP');
      return;
    }

    const { error: xpError } = await supabase.from('students').update({ total_xp: student.totalXp - reward.cost }).eq('id', studentId);
    if (xpError) {
      console.error('Error deducting XP:', xpError);
      toast.error('Failed to purchase reward');
      return;
    }

    const { error: rewardError } = await supabase.from('student_rewards').insert({
      student_id: studentId,
      reward_id: reward.id,
    });

    if (rewardError) {
      console.error('Error adding reward:', rewardError);
      toast.error('Failed to purchase reward');
      return;
    }

    invalidateStudents();
    toast.success(`${reward.name} purchased!`);
  };

  const useReward = async (studentId: string, rewardInstanceId: string) => {
    const { error } = await supabase.from('student_rewards').delete().eq('id', rewardInstanceId);
    if (error) {
      console.error('Error using reward:', error);
      toast.error('Failed to use reward');
      return;
    }
    invalidateStudents();
    toast.success('Reward used!');
  };

  // Test operations
  const addWeeklyTest = async (newTest: Omit<WeeklyTest, 'id'>) => {
    const { error } = await supabase.from('weekly_tests').insert({
      name: newTest.name,
      subject: newTest.subject,
      max_marks: newTest.maxMarks,
      test_date: newTest.date,
      class: newTest.class,
      tuition_id: tuitionId!,
    });

    if (error) {
      console.error('Error adding weekly test:', error);
      toast.error('Failed to create test');
      return;
    }
    invalidateTests();
    toast.success(`Test "${newTest.name}" created successfully!`);
  };

  const deleteWeeklyTest = async (testId: string) => {
    await supabase.from('student_test_results').delete().eq('test_id', testId);
    const { error } = await supabase.from('weekly_tests').delete().eq('id', testId);
    if (error) {
      console.error('Error deleting test:', error);
      toast.error('Failed to delete test');
      return;
    }
    invalidateTests();
    toast.success('Test deleted successfully!');
  };

  const addTestResult = async (result: StudentTestResult) => {
    const { error } = await supabase.from('student_test_results').upsert({
      test_id: result.testId,
      student_id: result.studentId,
      marks: result.marks,
    });

    if (error) {
      console.error('Error adding test result:', error);
      toast.error('Failed to save test result');
      return;
    }
    invalidateTests();
  };

  // Attendance operations
  const markAttendance = async (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string, subjectId?: string, facultyId?: string) => {
    try {
      const normalizedSubjectId = subjectId?.trim() || null;
      const normalizedFacultyId = facultyId?.trim() || null;

      let query = supabase.from('student_attendance').select('id').eq('student_id', studentId).eq('date', date);

      if (normalizedSubjectId) {
        query = query.eq('subject_id', normalizedSubjectId);
      } else {
        query = query.is('subject_id', null);
      }

      if (normalizedFacultyId) {
        query = query.eq('faculty_id', normalizedFacultyId);
      } else {
        query = query.is('faculty_id', null);
      }

      const { data: existingAttendance, error: checkError } = await query.maybeSingle();

      if (checkError) {
        console.error('Error checking existing attendance:', checkError);
        toast.error('Failed to mark attendance - please try again');
        return;
      }

      if (existingAttendance) {
        const { error } = await supabase
          .from('student_attendance')
          .update({ status, notes: notes || null, updated_at: new Date().toISOString() })
          .eq('id', existingAttendance.id);

        if (error) {
          console.error('Error updating attendance:', error);
          toast.error('Failed to update attendance');
          return;
        }
      } else {
        const { error } = await supabase.from('student_attendance').insert({
          student_id: studentId,
          date,
          status,
          notes: notes || null,
          subject_id: normalizedSubjectId,
          faculty_id: normalizedFacultyId,
        });

        if (error) {
          console.error('Error marking attendance:', error);
          toast.error('Failed to mark attendance');
          return;
        }
      }

      invalidateAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Network error - please check your connection and try again');
    }
  };

  // Fee operations
  const addFee = async (newFee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { error } = await supabase.from('student_fees').insert({
      student_id: newFee.studentId,
      fee_type: newFee.feeType,
      amount: newFee.amount,
      due_date: newFee.dueDate,
      paid_date: newFee.paidDate || null,
      status: newFee.status,
      notes: newFee.notes || null,
    });

    if (error) {
      console.error('Error adding fee:', error);
      toast.error('Failed to add fee');
      return;
    }
    invalidateFees();
    toast.success('Fee added successfully!');
  };

  const updateFeeStatus = async (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => {
    const { error } = await supabase.from('student_fees').update({ status, paid_date: paidDate || null }).eq('id', feeId);
    if (error) {
      console.error('Error updating fee status:', error);
      toast.error('Failed to update fee status');
      return;
    }
    invalidateFees();
  };

  const updateClassFee = async (className: string, amount: number) => {
    if (!tuitionId) {
      toast.error('Unable to save class fee - no tuition context');
      return;
    }

    const { data: existing } = await supabase.from('class_fees').select('id').eq('class', className).eq('tuition_id', tuitionId).maybeSingle();

    let error;
    if (existing) {
      const result = await supabase.from('class_fees').update({ amount }).eq('id', existing.id);
      error = result.error;
    } else {
      const result = await supabase.from('class_fees').insert({ class: className, amount, tuition_id: tuitionId });
      error = result.error;
    }

    if (error) {
      console.error('Error updating class fee:', error);
      toast.error('Failed to update class fee');
      return;
    }
    invalidateFees();
  };

  const deleteFee = async (feeId: string) => {
    await supabase.from('fee_payments').delete().eq('fee_id', feeId);
    const { error } = await supabase.from('student_fees').delete().eq('id', feeId);
    if (error) {
      console.error('Error deleting fee:', error);
      toast.error('Failed to delete fee');
      return;
    }
    invalidateFees();
    toast.success('Fee deleted successfully');
  };

  const fetchFees = useCallback(() => {
    invalidateFees();
  }, [invalidateFees]);

  // Challenge operations
  const addChallenge = async (newChallenge: Omit<Challenge, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('challenges').insert([{
      title: newChallenge.title,
      description: newChallenge.description,
      type: newChallenge.type,
      xp_reward: newChallenge.xpReward,
      difficulty: 'medium',
      start_date: newChallenge.startDate,
      end_date: newChallenge.endDate,
      is_active: newChallenge.isActive,
      tuition_id: tuitionId!,
    }]);

    if (error) {
      console.error('Error adding challenge:', error);
      toast.error('Failed to create challenge');
      return;
    }
    invalidateChallenges();
    toast.success('Challenge created successfully!');
  };

  const completeChallenge = async (studentId: string, challengeId: string) => {
    const { error } = await supabase.from('student_challenges').insert({
      student_id: studentId,
      challenge_id: challengeId,
      status: 'completed',
    });

    if (error) {
      console.error('Error completing challenge:', error);
      toast.error('Failed to complete challenge');
      return;
    }

    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
      await awardXP(studentId, challenge.xpReward, `Completed challenge: ${challenge.title}`);
    }
    invalidateChallenges();
  };

  // Announcement operations
  const addAnnouncement = async (newAnnouncement: Omit<Announcement, 'id' | 'publishedAt'>) => {
    const { error } = await supabase.from('announcements').insert({
      title: newAnnouncement.title,
      body: newAnnouncement.body,
      created_by: newAnnouncement.createdBy,
      target_class: newAnnouncement.targetClass,
      xp_bonus: newAnnouncement.xpBonus,
      tuition_id: tuitionId!,
    });

    if (error) {
      console.error('Error adding announcement:', error);
      toast.error('Failed to create announcement');
      return;
    }
    invalidateAnnouncements();
    toast.success('Announcement created successfully!');
  };

  // Faculty operations
  const addFaculty = async (name: string, email: string, phone: string, subjectIds: string[]) => {
    const { data: facultyData, error: facultyError } = await supabase
      .from('faculty')
      .insert({ name, email, phone, tuition_id: tuitionId! })
      .select()
      .single();

    if (facultyError) {
      console.error('Error adding faculty:', facultyError);
      toast.error('Failed to add faculty');
      return;
    }

    if (subjectIds.length > 0) {
      await supabase.from('faculty_subjects').insert(subjectIds.map(subjectId => ({
        faculty_id: facultyData.id,
        subject_id: subjectId,
      })));
    }

    toast.success('Faculty added successfully');
    invalidateFaculty();
  };

  const updateFaculty = async (id: string, name: string, email: string, phone: string, subjectIds: string[]) => {
    const { error: updateError } = await supabase
      .from('faculty')
      .update({ name, email, phone, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating faculty:', updateError);
      toast.error('Failed to update faculty');
      return;
    }

    await supabase.from('faculty_subjects').delete().eq('faculty_id', id);
    if (subjectIds.length > 0) {
      await supabase.from('faculty_subjects').insert(subjectIds.map(subjectId => ({
        faculty_id: id,
        subject_id: subjectId,
      })));
    }

    toast.success('Faculty updated successfully');
    invalidateFaculty();
  };

  const deleteFaculty = async (id: string) => {
    const { error } = await supabase.from('faculty').delete().eq('id', id);
    if (error) {
      console.error('Error deleting faculty:', error);
      toast.error('Failed to delete faculty');
      return;
    }
    toast.success('Faculty deleted successfully');
    invalidateFaculty();
  };

  // Subject operations
  const addSubject = async (name: string, classValue: ClassName) => {
    const { error } = await supabase.from('subjects').insert({ name, class: classValue, tuition_id: tuitionId! });
    if (error) {
      console.error('Error adding subject:', error);
      toast.error('Failed to add subject');
      return;
    }
    toast.success('Subject added successfully');
    invalidateSubjects();
  };

  const updateSubject = async (id: string, name: string, classValue: ClassName) => {
    const { error } = await supabase.from('subjects').update({ name, class: classValue }).eq('id', id);
    if (error) {
      console.error('Error updating subject:', error);
      toast.error('Failed to update subject');
      return;
    }
    toast.success('Subject updated successfully');
    invalidateSubjects();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
      return;
    }
    toast.success('Subject deleted successfully');
    invalidateSubjects();
  };

  // Timetable operations
  const addTimetableEntry = async (
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomId?: string,
    roomNumber?: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string,
    eventType?: string,
    notes?: string,
    divisionId?: string
  ) => {
    const { error } = await supabase.from('timetable').insert({
      class: classValue,
      division_id: divisionId || null,
      subject_id: subjectId,
      faculty_id: facultyId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      type,
      room_id: roomId,
      room_number: roomNumber,
      specific_date: specificDate,
      start_date: startDate,
      end_date: endDate,
      event_type: eventType,
      notes,
      tuition_id: tuitionId!,
    });

    if (error) {
      console.error('Error adding timetable entry:', error);
      toast.error('Failed to add timetable entry');
      return;
    }
    toast.success('Timetable entry added successfully');
    invalidateTimetable();
  };

  const updateTimetableEntry = async (
    id: string,
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomId?: string,
    roomNumber?: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string,
    eventType?: string,
    notes?: string,
    divisionId?: string
  ) => {
    const { error } = await supabase.from('timetable').update({
      class: classValue,
      division_id: divisionId || null,
      subject_id: subjectId,
      faculty_id: facultyId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      type,
      room_id: roomId,
      room_number: roomNumber,
      specific_date: specificDate,
      start_date: startDate,
      end_date: endDate,
      event_type: eventType,
      notes,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    if (error) {
      console.error('Error updating timetable entry:', error);
      toast.error('Failed to update timetable entry');
      return;
    }
    toast.success('Timetable entry updated successfully');
    invalidateTimetable();
  };

  const deleteTimetableEntry = async (id: string) => {
    const { error } = await supabase.from('timetable').delete().eq('id', id);
    if (error) {
      console.error('Error deleting timetable entry:', error);
      toast.error('Failed to delete timetable entry');
      return;
    }
    toast.success('Timetable entry deleted successfully');
    invalidateTimetable();
  };

  // Division operations
  const addDivision = async (classValue: ClassName, name: string) => {
    const { error } = await supabase.from('divisions').insert({
      class: classValue,
      name: name.trim(),
      tuition_id: tuitionId!,
    });

    if (error) {
      console.error('Error adding division:', error);
      toast.error('Failed to add division');
      return;
    }
    toast.success('Division added successfully');
    invalidateDivisions();
  };

  const updateDivision = async (id: string, name: string) => {
    const { error } = await supabase.from('divisions').update({ name: name.trim() }).eq('id', id);
    if (error) {
      console.error('Error updating division:', error);
      toast.error('Failed to update division');
      return;
    }
    toast.success('Division updated successfully');
    invalidateDivisions();
    invalidateStudents();
  };

  const deleteDivision = async (id: string) => {
    const { error } = await supabase.from('divisions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting division:', error);
      toast.error('Failed to delete division. Make sure no students are assigned to it.');
      return;
    }
    toast.success('Division deleted successfully');
    invalidateDivisions();
    invalidateStudents();
  };

  // Room operations
  const addRoom = async (name: string, capacity?: number, description?: string) => {
    const { error } = await supabase.from('rooms').insert({ name, capacity, description, tuition_id: tuitionId! });
    if (error) {
      console.error('Error adding room:', error);
      toast.error('Failed to add room');
      return;
    }
    toast.success('Room added successfully');
    invalidateRooms();
  };

  const updateRoom = async (id: string, name: string, capacity?: number, description?: string) => {
    const { error } = await supabase.from('rooms').update({ name, capacity, description, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('Error updating room:', error);
      toast.error('Failed to update room');
      return;
    }
    toast.success('Room updated successfully');
    invalidateRooms();
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room');
      return;
    }
    toast.success('Room deleted successfully');
    invalidateRooms();
  };

  return {
    students,
    weeklyTests,
    testResults,
    challenges,
    studentChallenges,
    announcements,
    attendance,
    fees,
    classFees,
    faculty,
    subjects,
    timetable,
    divisions,
    rooms,
    loading,
    addStudent,
    addWeeklyTest,
    deleteWeeklyTest,
    addTestResult,
    addXp,
    reduceXp,
    awardXP,
    removeStudent,
    assignTeam,
    buyReward,
    useReward,
    addChallenge,
    completeChallenge,
    addAnnouncement,
    markAttendance,
    addFee,
    updateFeeStatus,
    updateClassFee,
    addFaculty,
    updateFaculty,
    deleteFaculty,
    addSubject,
    updateSubject,
    deleteSubject,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    addDivision,
    updateDivision,
    deleteDivision,
    updateStudentDivision,
    addRoom,
    updateRoom,
    deleteRoom,
    updateStudent,
    assignStudentEmail,
    deleteFee,
    fetchFees,
  };
}
