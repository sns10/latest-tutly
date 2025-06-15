import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Student, WeeklyTest, StudentTestResult, Badge, PurchasedReward, ClassName, TeamName, XPCategory, Challenge, StudentChallenge, Announcement, StudentAttendance, StudentFee } from '@/types';
import { toast } from 'sonner';
import { BADGE_DEFINITIONS } from '@/config/badges';

// It's recommended to move this interface to `src/types.ts` when possible.
interface ClassFee {
  class: string;
  amount: number;
}

export function useSupabaseData() {
  const [students, setStudents] = useState<Student[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>([]);
  const [testResults, setTestResults] = useState<StudentTestResult[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [studentChallenges, setStudentChallenges] = useState<StudentChallenge[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudents(),
        fetchWeeklyTests(),
        fetchTestResults(),
        fetchChallenges(),
        fetchStudentChallenges(),
        fetchAnnouncements(),
        fetchAttendance(),
        fetchFees(),
        fetchClassFees()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const { data: studentsData, error } = await supabase
      .from('students')
      .select(`
        *,
        student_xp (category, amount),
        student_badges (badge_id, date_earned, badges (name, description, emoji)),
        student_rewards (reward_id, instance_id, purchased_at, rewards (name, cost, description, emoji))
      `);

    if (error) {
      console.error('Error fetching students:', error);
      return;
    }

    const formattedStudents: Student[] = studentsData.map(student => ({
      id: student.id,
      name: student.name,
      class: student.class as ClassName,
      avatar: student.avatar || '',
      team: student.team as TeamName | null,
      totalXp: student.total_xp,
      xp: {
        blackout: student.student_xp.find((x: any) => x.category === 'blackout')?.amount || 0,
        futureMe: student.student_xp.find((x: any) => x.category === 'futureMe')?.amount || 0,
        recallWar: student.student_xp.find((x: any) => x.category === 'recallWar')?.amount || 0,
      },
      badges: student.student_badges.map((sb: any) => ({
        id: sb.badge_id,
        name: sb.badges.name,
        description: sb.badges.description,
        emoji: sb.badges.emoji,
        dateEarned: sb.date_earned,
      })),
      purchasedRewards: student.student_rewards.map((sr: any) => ({
        id: sr.reward_id,
        instanceId: sr.instance_id,
        name: sr.rewards.name,
        cost: sr.rewards.cost,
        description: sr.rewards.description,
        emoji: sr.rewards.emoji,
      })),
    }));

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
    const { data, error } = await supabase
      .from('class_fees')
      .select('*');

    if (error) {
      console.error('Error fetching class fees:', error);
      toast.error('Failed to load class fees');
      return;
    }
    setClassFees(data.map(d => ({ class: d.class, amount: Number(d.amount) })));
  };

  const addStudent = async (newStudent: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name: newStudent.name,
        class: newStudent.class,
        avatar: newStudent.avatar,
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
      .eq('instance_id', rewardInstanceId);

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
      .insert({
        title: newChallenge.title,
        description: newChallenge.description,
        type: newChallenge.type,
        xp_reward: newChallenge.xpReward,
        start_date: newChallenge.startDate,
        end_date: newChallenge.endDate,
        is_active: newChallenge.isActive,
      });

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
      });

    if (error) {
      console.error('Error adding announcement:', error);
      toast.error('Failed to create announcement');
      return;
    }

    await fetchAnnouncements();
    toast.success('Announcement created successfully!');
  };

  const markAttendance = async (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string) => {
    const { error } = await supabase
      .from('student_attendance')
      .upsert({
        student_id: studentId,
        date,
        status,
        notes: notes || null,
      }, { onConflict: 'student_id,date' });

    if (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
      return;
    }

    await fetchAttendance();
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
    const { error } = await supabase
      .from('class_fees')
      .update({ amount })
      .eq('class', className);

    if (error) {
      console.error('Error updating class fee:', error);
      toast.error('Failed to update class fee');
      return;
    }

    await fetchClassFees();
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
    loading,
    addStudent,
    addWeeklyTest,
    deleteWeeklyTest,
    addTestResult,
    addXp,
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
  };
}
