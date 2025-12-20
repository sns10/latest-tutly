import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Student, WeeklyTest, StudentTestResult, Badge, PurchasedReward, ClassName, TeamName, XPCategory, Challenge, StudentChallenge, Announcement, StudentAttendance, StudentFee, ClassFee, Faculty, Subject, Timetable, Division, Room } from '@/types';
import { toast } from 'sonner';
import { BADGE_DEFINITIONS } from '@/config/badges';
import { XP_STORE_ITEMS } from '@/config/rewards';
import { useUserTuition } from './useUserTuition';

// The ClassFee interface has been moved to src/types.ts to be shared across the application.

export function useSupabaseData() {
  const { tuitionId } = useUserTuition();
  const [students, setStudents] = useState<Student[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>([]);
  const [testResults, setTestResults] = useState<StudentTestResult[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [studentChallenges, setStudentChallenges] = useState<StudentChallenge[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<Timetable[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data when tuitionId is available
  useEffect(() => {
    if (tuitionId) {
      fetchAllData();
    }
  }, [tuitionId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDivisions(),
        fetchStudents(),
        fetchWeeklyTests(),
        fetchTestResults(),
        fetchChallenges(),
        fetchStudentChallenges(),
        fetchAnnouncements(),
        fetchAttendance(),
        fetchFees(),
        fetchClassFees(),
        fetchFaculty(),
        fetchSubjects(),
        fetchTimetable(),
        fetchRooms()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDivisions = async () => {
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .order('class', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching divisions:', error);
      return;
    }

    const formattedDivisions: Division[] = data.map(div => ({
      id: div.id,
      class: div.class as ClassName,
      name: div.name,
      createdAt: div.created_at,
    }));

    setDivisions(formattedDivisions);
  };

  const fetchStudents = async () => {
    const { data: studentsData, error } = await supabase
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
      return;
    }

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
      email: (student as any).email || undefined,
      rollNo: (student as any).roll_no || undefined,
      team: student.team as TeamName | null,
      totalXp: student.total_xp,
      xp: {
        blackout: student.student_xp.find((x: any) => x.category === 'blackout')?.amount || 0,
        futureMe: student.student_xp.find((x: any) => x.category === 'futureMe')?.amount || 0,
        recallWar: student.student_xp.find((x: any) => x.category === 'recallWar')?.amount || 0,
      },
      badges: student.student_badges.map((sb: any) => {
        const badgeDef = BADGE_DEFINITIONS.find(b => b.id === sb.badge_id);
        return {
          id: sb.badge_id,
          name: badgeDef?.name || '',
          description: badgeDef?.description || '',
          emoji: badgeDef?.emoji || '',
          dateEarned: sb.earned_at,
        };
      }),
      purchasedRewards: student.student_rewards.map((sr: any) => {
        const rewardDef = XP_STORE_ITEMS.find(r => r.id === sr.reward_id);
        return {
          id: sr.reward_id,
          instanceId: sr.id || `${sr.reward_id}-${sr.purchased_at}`,
          name: rewardDef?.name || '',
          cost: rewardDef?.cost || 0,
          description: rewardDef?.description || '',
          emoji: rewardDef?.emoji || '',
        };
      }),
    }));

    // Sort by roll number (students with roll numbers first, then by name alphabetically)
    formattedStudents.sort((a, b) => {
      if (a.rollNo && b.rollNo) return a.rollNo - b.rollNo;
      if (a.rollNo && !b.rollNo) return -1;
      if (!a.rollNo && b.rollNo) return 1;
      return a.name.localeCompare(b.name);
    });

    setStudents(formattedStudents);
  };

  const fetchWeeklyTests = async () => {
    const { data, error } = await supabase
      .from('weekly_tests')
      .select('*')
      .order('test_date', { ascending: false });

    if (error) {
      console.error('Error fetching weekly tests:', error);
      return;
    }

    const formattedTests: WeeklyTest[] = data.map(test => ({
      id: test.id,
      name: test.name,
      subject: test.subject,
      maxMarks: test.max_marks,
      date: test.test_date,
      class: test.class as ClassName,
    }));

    setWeeklyTests(formattedTests);
  };

  const fetchTestResults = async () => {
    const { data, error } = await supabase
      .from('student_test_results')
      .select('*');

    if (error) {
      console.error('Error fetching test results:', error);
      return;
    }

    const formattedResults: StudentTestResult[] = data.map(result => ({
      testId: result.test_id,
      studentId: result.student_id,
      marks: Number(result.marks),
    }));

    setTestResults(formattedResults);
  };

  const fetchChallenges = async () => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching challenges:', error);
      return;
    }

    const formattedChallenges: Challenge[] = data.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      xpReward: challenge.xp_reward,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      isActive: challenge.is_active,
      createdAt: challenge.created_at,
    }));

    setChallenges(formattedChallenges);
  };

  const fetchStudentChallenges = async () => {
    const { data, error } = await supabase
      .from('student_challenges')
      .select('*');

    if (error) {
      console.error('Error fetching student challenges:', error);
      return;
    }

    const formattedStudentChallenges: StudentChallenge[] = data.map(sc => ({
      id: sc.id,
      studentId: sc.student_id,
      challengeId: sc.challenge_id,
      completedAt: sc.completed_at,
      status: sc.status,
    }));

    setStudentChallenges(formattedStudentChallenges);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return;
    }

    const formattedAnnouncements: Announcement[] = data.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      publishedAt: announcement.published_at,
      createdBy: announcement.created_by,
      targetClass: announcement.target_class,
      xpBonus: announcement.xp_bonus,
    }));

    setAnnouncements(formattedAnnouncements);
  };

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from('student_attendance')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance:', error);
      return;
    }

    const formattedAttendance: StudentAttendance[] = data.map(attendance => ({
      id: attendance.id,
      studentId: attendance.student_id,
      date: attendance.date,
      status: attendance.status as 'present' | 'absent' | 'late' | 'excused',
      notes: attendance.notes || undefined,
      subjectId: attendance.subject_id || undefined,
      facultyId: attendance.faculty_id || undefined,
      createdAt: attendance.created_at,
      updatedAt: attendance.updated_at,
    }));

    setAttendance(formattedAttendance);
  };

  const fetchFees = async () => {
    const { data, error } = await supabase
      .from('student_fees')
      .select('*')
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Error fetching fees:', error);
      return;
    }

    const formattedFees: StudentFee[] = data.map(fee => ({
      id: fee.id,
      studentId: fee.student_id,
      feeType: fee.fee_type,
      amount: Number(fee.amount),
      dueDate: fee.due_date,
      paidDate: fee.paid_date || undefined,
      status: fee.status as 'paid' | 'unpaid' | 'partial' | 'overdue',
      notes: fee.notes || undefined,
      createdAt: fee.created_at,
      updatedAt: fee.updated_at,
    }));

    setFees(formattedFees);
  };

  const fetchClassFees = async () => {
    if (!tuitionId) return;
    
    const { data, error } = await supabase
      .from('class_fees')
      .select('*')
      .eq('tuition_id', tuitionId);

    if (error) {
      console.error('Error fetching class fees:', error);
      toast.error('Failed to load class fees');
      return;
    }
    setClassFees(data.map(d => ({ class: d.class as ClassName, amount: Number(d.amount) })));
  };

  const addStudent = async (newStudent: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => {
    let divisionIdToUse = newStudent.divisionId;

    // If no division provided, check if Division A exists for this class
    if (!divisionIdToUse || divisionIdToUse === 'none') {
      const existingDivisionA = divisions.find(
        d => d.class === newStudent.class && d.name === 'A'
      );

      if (existingDivisionA) {
        divisionIdToUse = existingDivisionA.id;
      } else {
        // Create Division A for this class
        const { data: newDivision, error: divError } = await supabase
          .from('divisions')
          .insert({
            class: newStudent.class,
            name: 'A',
            tuition_id: tuitionId!,
          })
          .select()
          .single();

        if (divError) {
          console.error('Error creating default division:', divError);
        } else {
          divisionIdToUse = newDivision.id;
          await fetchDivisions(); // Refresh divisions
        }
      }
    }

    // Use provided roll number or calculate next one for this class/division
    let rollNoToUse = newStudent.rollNo;
    if (!rollNoToUse) {
      const existingStudents = students.filter(
        s => s.class === newStudent.class && s.divisionId === divisionIdToUse
      );
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

    // Initialize XP for new student
    await supabase.from('student_xp').insert([
      { student_id: data.id, category: 'blackout', amount: 0 },
      { student_id: data.id, category: 'futureMe', amount: 0 },
      { student_id: data.id, category: 'recallWar', amount: 0 },
    ]);

    await fetchStudents();
    toast.success('Student added successfully!');
  };

  const addWeeklyTest = async (newTest: Omit<WeeklyTest, 'id'>) => {
    const { data, error } = await supabase
      .from('weekly_tests')
      .insert({
        name: newTest.name,
        subject: newTest.subject,
        max_marks: newTest.maxMarks,
        test_date: newTest.date,
        class: newTest.class,
        tuition_id: tuitionId!,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding weekly test:', error);
      toast.error('Failed to create test');
      return;
    }

    await fetchWeeklyTests();
    toast.success(`Test "${newTest.name}" created successfully!`);
  };

  const deleteWeeklyTest = async (testId: string) => {
    // First delete all related test results
    const { error: resultsError } = await supabase
      .from('student_test_results')
      .delete()
      .eq('test_id', testId);

    if (resultsError) {
      console.error('Error deleting test results:', resultsError);
      toast.error('Failed to delete test results');
      return;
    }

    // Then delete the test
    const { error } = await supabase
      .from('weekly_tests')
      .delete()
      .eq('id', testId);

    if (error) {
      console.error('Error deleting test:', error);
      toast.error('Failed to delete test');
      return;
    }

    await fetchWeeklyTests();
    await fetchTestResults();
    toast.success('Test deleted successfully!');
  };

  const addTestResult = async (result: StudentTestResult) => {
    const { error } = await supabase
      .from('student_test_results')
      .upsert({
        test_id: result.testId,
        student_id: result.studentId,
        marks: result.marks,
      });

    if (error) {
      console.error('Error adding test result:', error);
      toast.error('Failed to save test result');
      return;
    }

    await fetchTestResults();
  };

  const addXp = async (studentId: string, category: XPCategory, amount: number) => {
    // Get current XP for this category
    const { data: currentXpData, error: fetchError } = await supabase
      .from('student_xp')
      .select('amount')
      .eq('student_id', studentId)
      .eq('category', category)
      .single();

    if (fetchError) {
      console.error('Error fetching current XP:', fetchError);
      toast.error('Failed to update XP');
      return;
    }

    const newAmount = (currentXpData?.amount || 0) + amount;

    // Update XP in database
    const { error: xpError } = await supabase
      .from('student_xp')
      .upsert(
        {
          student_id: studentId,
          category,
          amount: newAmount,
        }, 
        { onConflict: 'student_id,category' }
      );

    if (xpError) {
      console.error('Error updating XP:', xpError);
      toast.error('Failed to update XP');
      return;
    }

    // Get current total XP
    const { data: studentData, error: studentFetchError } = await supabase
      .from('students')
      .select('total_xp')
      .eq('id', studentId)
      .single();

    if (studentFetchError) {
      console.error('Error fetching student total XP:', studentFetchError);
      return;
    }

    const newTotalXp = (studentData?.total_xp || 0) + amount;

    // Update total XP
    const { error: totalError } = await supabase
      .from('students')
      .update({
        total_xp: newTotalXp,
      })
      .eq('id', studentId);

    if (totalError) {
      console.error('Error updating total XP:', totalError);
    }

    await fetchStudents();
  };

  const reduceXp = async (studentId: string, amount: number) => {
    // Get current total XP
    const { data: studentData, error: fetchError } = await supabase
      .from('students')
      .select('total_xp')
      .eq('id', studentId)
      .single();

    if (fetchError) {
      console.error('Error fetching student:', fetchError);
      toast.error('Failed to reduce XP');
      return;
    }

    const currentXp = studentData?.total_xp || 0;
    const newTotalXp = Math.max(0, currentXp - amount); // Don't go below 0

    const { error } = await supabase
      .from('students')
      .update({
        total_xp: newTotalXp,
      })
      .eq('id', studentId);

    if (error) {
      console.error('Error reducing XP:', error);
      toast.error('Failed to reduce XP');
      return;
    }

    const student = students.find(s => s.id === studentId);
    if (student) {
      toast.success(`${student.name} lost -${amount} XP`);
    }

    await fetchStudents();
  };

  const awardXP = async (studentId: string, amount: number, reason: string) => {
    // Get current total XP
    const { data: studentData, error: fetchError } = await supabase
      .from('students')
      .select('total_xp')
      .eq('id', studentId)
      .single();

    if (fetchError) {
      console.error('Error fetching student:', fetchError);
      toast.error('Failed to award XP');
      return;
    }

    const newTotalXp = (studentData?.total_xp || 0) + amount;

    const { error } = await supabase
      .from('students')
      .update({
        total_xp: newTotalXp,
      })
      .eq('id', studentId);

    if (error) {
      console.error('Error awarding XP:', error);
      toast.error('Failed to award XP');
      return;
    }

    const student = students.find(s => s.id === studentId);
    if (student) {
      toast.success(`${student.name} earned +${amount} XP! (${reason})`);
    }

    await fetchStudents();
  };

  const removeStudent = async (studentId: string) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
      return;
    }

    await fetchStudents();
    toast.success('Student removed successfully');
  };

  const assignTeam = async (studentId: string, team: TeamName | null) => {
    const { error } = await supabase
      .from('students')
      .update({ team })
      .eq('id', studentId);

    if (error) {
      console.error('Error assigning team:', error);
      toast.error('Failed to assign team');
      return;
    }

    await fetchStudents();
  };

  const buyReward = async (studentId: string, reward: any) => {
    const student = students.find(s => s.id === studentId);
    if (!student || student.totalXp < reward.cost) {
      toast.error('Insufficient XP');
      return;
    }

    // Deduct XP and add reward
    const { error: xpError } = await supabase
      .from('students')
      .update({
        total_xp: student.totalXp - reward.cost,
      })
      .eq('id', studentId);

    if (xpError) {
      console.error('Error deducting XP:', xpError);
      toast.error('Failed to purchase reward');
      return;
    }

    const { error: rewardError } = await supabase
      .from('student_rewards')
      .insert({
        student_id: studentId,
        reward_id: reward.id,
        instance_id: `${reward.id}-${new Date().toISOString()}`,
      });

    if (rewardError) {
      console.error('Error adding reward:', rewardError);
      toast.error('Failed to purchase reward');
      return;
    }

    await fetchStudents();
    toast.success(`${reward.name} purchased!`);
  };

  const useReward = async (studentId: string, rewardInstanceId: string) => {
    const { error } = await supabase
      .from('student_rewards')
      .delete()
      .eq('id', rewardInstanceId);

    if (error) {
      console.error('Error using reward:', error);
      toast.error('Failed to use reward');
      return;
    }

    await fetchStudents();
    toast.success('Reward used!');
  };

  const addChallenge = async (newChallenge: Omit<Challenge, 'id' | 'createdAt'>) => {
    const { error } = await supabase
      .from('challenges')
      .insert([{
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

    await fetchChallenges();
    toast.success('Challenge created successfully!');
  };

  const completeChallenge = async (studentId: string, challengeId: string) => {
    const { error } = await supabase
      .from('student_challenges')
      .insert({
        student_id: studentId,
        challenge_id: challengeId,
        status: 'completed',
      });

    if (error) {
      console.error('Error completing challenge:', error);
      toast.error('Failed to complete challenge');
      return;
    }

    // Award XP for completing the challenge
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
      await awardXP(studentId, challenge.xpReward, `Completed challenge: ${challenge.title}`);
    }

    await fetchStudentChallenges();
  };

  const addAnnouncement = async (newAnnouncement: Omit<Announcement, 'id' | 'publishedAt'>) => {
    const { error } = await supabase
      .from('announcements')
      .insert({
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

    await fetchAnnouncements();
    toast.success('Announcement created successfully!');
  };

  const markAttendance = async (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string, subjectId?: string, facultyId?: string) => {
    try {
      // Normalize the subject and faculty IDs (empty string should be treated as null)
      const normalizedSubjectId = subjectId && subjectId.trim() !== '' ? subjectId : null;
      const normalizedFacultyId = facultyId && facultyId.trim() !== '' ? facultyId : null;

      // Build query to check if attendance already exists for this combination
      let query = supabase
        .from('student_attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', date);
      
      // Handle null checks for subject_id and faculty_id
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
        // Update existing record
        const { error } = await supabase
          .from('student_attendance')
          .update({
            status,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAttendance.id);

        if (error) {
          console.error('Error updating attendance:', error);
          toast.error('Failed to update attendance');
          return;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('student_attendance')
          .insert({
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

      // Optimistic update - add to local state immediately
      const newRecord: StudentAttendance = {
        id: existingAttendance?.id || crypto.randomUUID(),
        studentId,
        date,
        status,
        notes: notes || undefined,
        subjectId: normalizedSubjectId || undefined,
        facultyId: normalizedFacultyId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAttendance(prev => {
        // Remove existing record if updating
        const filtered = prev.filter(a => !(
          a.studentId === studentId && 
          a.date === date && 
          (normalizedSubjectId ? a.subjectId === normalizedSubjectId : !a.subjectId) &&
          (normalizedFacultyId ? a.facultyId === normalizedFacultyId : !a.facultyId)
        ));
        return [newRecord, ...filtered];
      });

    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Network error - please check your connection and try again');
    }
  };

  const addFee = async (newFee: Omit<StudentFee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { error } = await supabase
      .from('student_fees')
      .insert({
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

    await fetchFees();
    toast.success('Fee added successfully!');
  };

  const updateFeeStatus = async (feeId: string, status: 'paid' | 'unpaid' | 'partial' | 'overdue', paidDate?: string) => {
    const { error } = await supabase
      .from('student_fees')
      .update({
        status,
        paid_date: paidDate || null,
      })
      .eq('id', feeId);

    if (error) {
      console.error('Error updating fee status:', error);
      toast.error('Failed to update fee status');
      return;
    }

    await fetchFees();
  };

  const updateClassFee = async (className: string, amount: number) => {
    if (!tuitionId) {
      toast.error('Unable to save class fee - no tuition context');
      return;
    }
    
    // First check if the record exists
    const { data: existing } = await supabase
      .from('class_fees')
      .select('id')
      .eq('class', className)
      .eq('tuition_id', tuitionId)
      .maybeSingle();
    
    let error;
    if (existing) {
      // Update existing record
      const result = await supabase
        .from('class_fees')
        .update({ amount })
        .eq('id', existing.id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from('class_fees')
        .insert({ class: className, amount, tuition_id: tuitionId });
      error = result.error;
    }

    if (error) {
      console.error('Error updating class fee:', error);
      toast.error('Failed to update class fee');
      return;
    }

    await fetchClassFees();
  };

  // Fetch Faculty
  const fetchFaculty = async () => {
    const { data, error } = await supabase
      .from('faculty')
      .select(`
        *,
        faculty_subjects (
          subject_id,
          subjects (*)
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching faculty:', error);
      return;
    }

    const formattedFaculty: Faculty[] = data.map((f: any) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      phone: f.phone,
      subjects: f.faculty_subjects?.map((fs: any) => ({
        id: fs.subjects.id,
        name: fs.subjects.name,
        class: fs.subjects.class,
        createdAt: fs.subjects.created_at,
      })) || [],
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    setFaculty(formattedFaculty);
  };

  // Fetch Subjects
  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('class, name');

    if (error) {
      console.error('Error fetching subjects:', error);
      return;
    }

    const formattedSubjects: Subject[] = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      class: s.class,
      createdAt: s.created_at,
    }));

    setSubjects(formattedSubjects);
  };

  // Fetch Timetable
  const fetchTimetable = async () => {
    const { data, error } = await supabase
      .from('timetable')
      .select(`
        *,
        subjects (*),
        faculty (*),
        divisions (*)
      `)
      .order('day_of_week, start_time');

    if (error) {
      console.error('Error fetching timetable:', error);
      return;
    }

    const formattedTimetable: Timetable[] = data.map((t: any) => ({
      id: t.id,
      class: t.class,
      divisionId: t.division_id,
      division: t.divisions ? {
        id: t.divisions.id,
        class: t.divisions.class as ClassName,
        name: t.divisions.name,
        createdAt: t.divisions.created_at,
      } : undefined,
      subjectId: t.subject_id,
      facultyId: t.faculty_id,
      dayOfWeek: t.day_of_week,
      startTime: t.start_time,
      endTime: t.end_time,
      roomNumber: t.room_number,
      roomId: t.room_id,
      type: t.type || 'regular',
      specificDate: t.specific_date,
      startDate: t.start_date,
      endDate: t.end_date,
      eventType: t.event_type,
      notes: t.notes,
      subject: t.subjects ? {
        id: t.subjects.id,
        name: t.subjects.name,
        class: t.subjects.class,
        createdAt: t.subjects.created_at,
      } : undefined,
      faculty: t.faculty ? {
        id: t.faculty.id,
        name: t.faculty.name,
        email: t.faculty.email,
        phone: t.faculty.phone,
        createdAt: t.faculty.created_at,
        updatedAt: t.faculty.updated_at,
      } : undefined,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    setTimetable(formattedTimetable);
  };

  // Fetch Rooms
  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching rooms:', error);
      return;
    }

    const formattedRooms: Room[] = data.map((r: any) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      description: r.description,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    setRooms(formattedRooms);
  };

  // Add Room
  const addRoom = async (name: string, capacity?: number, description?: string) => {
    const { error } = await supabase
      .from('rooms')
      .insert({ name, capacity, description, tuition_id: tuitionId! });

    if (error) {
      console.error('Error adding room:', error);
      toast.error('Failed to add room');
      return;
    }

    toast.success('Room added successfully');
    await fetchRooms();
  };

  // Update Room
  const updateRoom = async (id: string, name: string, capacity?: number, description?: string) => {
    const { error } = await supabase
      .from('rooms')
      .update({ name, capacity, description, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating room:', error);
      toast.error('Failed to update room');
      return;
    }

    toast.success('Room updated successfully');
    await fetchRooms();
  };

  // Delete Room
  const deleteRoom = async (id: string) => {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room');
      return;
    }

    toast.success('Room deleted successfully');
    await fetchRooms();
  };

  // Add Faculty
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

    // Add faculty-subject mappings
    if (subjectIds.length > 0) {
      const { error: mappingError } = await supabase
        .from('faculty_subjects')
        .insert(subjectIds.map(subjectId => ({
          faculty_id: facultyData.id,
          subject_id: subjectId,
        })));

      if (mappingError) {
        console.error('Error adding faculty subjects:', mappingError);
      }
    }

    toast.success('Faculty added successfully');
    await fetchFaculty();
  };

  // Update Faculty
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

    // Remove old subject mappings and add new ones
    await supabase.from('faculty_subjects').delete().eq('faculty_id', id);
    
    if (subjectIds.length > 0) {
      await supabase
        .from('faculty_subjects')
        .insert(subjectIds.map(subjectId => ({
          faculty_id: id,
          subject_id: subjectId,
        })));
    }

    toast.success('Faculty updated successfully');
    await fetchFaculty();
  };

  // Delete Faculty
  const deleteFaculty = async (id: string) => {
    const { error } = await supabase
      .from('faculty')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting faculty:', error);
      toast.error('Failed to delete faculty');
      return;
    }

    toast.success('Faculty deleted successfully');
    await fetchFaculty();
  };

  // Add Subject
  const addSubject = async (name: string, classValue: ClassName) => {
    const { error } = await supabase
      .from('subjects')
      .insert({ name, class: classValue, tuition_id: tuitionId! });

    if (error) {
      console.error('Error adding subject:', error);
      toast.error('Failed to add subject');
      return;
    }

    toast.success('Subject added successfully');
    await fetchSubjects();
  };

  // Update Subject
  const updateSubject = async (id: string, name: string, classValue: ClassName) => {
    const { error } = await supabase
      .from('subjects')
      .update({ name, class: classValue })
      .eq('id', id);

    if (error) {
      console.error('Error updating subject:', error);
      toast.error('Failed to update subject');
      return;
    }

    toast.success('Subject updated successfully');
    await fetchSubjects();
  };

  // Delete Subject
  const deleteSubject = async (id: string) => {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
      return;
    }

    toast.success('Subject deleted successfully');
    await fetchSubjects();
  };

  // Add Timetable Entry
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
    const { error } = await supabase
      .from('timetable')
      .insert({
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
    await fetchTimetable();
  };

  // Update Timetable Entry
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
    const { error } = await supabase
      .from('timetable')
      .update({
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
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating timetable entry:', error);
      toast.error('Failed to update timetable entry');
      return;
    }

    toast.success('Timetable entry updated successfully');
    await fetchTimetable();
  };

  // Delete Timetable Entry
  const deleteTimetableEntry = async (id: string) => {
    const { error } = await supabase
      .from('timetable')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting timetable entry:', error);
      toast.error('Failed to delete timetable entry');
      return;
    }

    toast.success('Timetable entry deleted successfully');
    await fetchTimetable();
  };

  // Add Division
  const addDivision = async (classValue: ClassName, name: string) => {
    const { error } = await supabase
      .from('divisions')
      .insert({
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
    await fetchDivisions();
  };

  // Update Division
  const updateDivision = async (id: string, name: string) => {
    const { error } = await supabase
      .from('divisions')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating division:', error);
      toast.error('Failed to update division');
      return;
    }

    toast.success('Division updated successfully');
    await fetchDivisions();
    await fetchStudents(); // Refresh students to get updated division names
  };

  // Delete Division
  const deleteDivision = async (id: string) => {
    const { error } = await supabase
      .from('divisions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting division:', error);
      toast.error('Failed to delete division. Make sure no students are assigned to it.');
      return;
    }

    toast.success('Division deleted successfully');
    await fetchDivisions();
    await fetchStudents(); // Refresh students in case any were affected
  };

  // Update Student Division
  const updateStudentDivision = async (studentId: string, divisionId: string | null) => {
    const { error } = await supabase
      .from('students')
      .update({ division_id: divisionId })
      .eq('id', studentId);

    if (error) {
      console.error('Error updating student division:', error);
      toast.error('Failed to update student division');
      return;
    }

    toast.success('Student division updated successfully');
    await fetchStudents();
  };

  // Update Student Details
  const updateStudent = async (studentId: string, updates: { name?: string; class?: ClassName; divisionId?: string | null; email?: string | null }) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.class !== undefined) updateData.class = updates.class;
    if (updates.divisionId !== undefined) updateData.division_id = updates.divisionId;
    if (updates.email !== undefined) updateData.email = updates.email;

    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId);

    if (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
      return;
    }

    toast.success('Student updated successfully');
    await fetchStudents();
  };

  // Assign email for student portal access
  const assignStudentEmail = async (studentId: string, email: string): Promise<boolean> => {
    const { error } = await supabase
      .from('students')
      .update({ email })
      .eq('id', studentId);

    if (error) {
      console.error('Error assigning student email:', error);
      toast.error('Failed to assign email');
      return false;
    }

    await fetchStudents();
    return true;
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
  };
}
