
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Student, WeeklyTest, StudentTestResult, Badge, PurchasedReward, ClassName, TeamName, XPCategory } from '@/types';
import { toast } from 'sonner';
import { BADGE_DEFINITIONS } from '@/config/badges';

export function useSupabaseData() {
  const [students, setStudents] = useState<Student[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>([]);
  const [testResults, setTestResults] = useState<StudentTestResult[]>([]);
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
        fetchTestResults()
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
      .upsert({
        student_id: studentId,
        category,
        amount: newAmount,
      }, { onConflict: ['student_id', 'category'] }); // <-- Added onConflict here

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

  return {
    students,
    weeklyTests,
    testResults,
    loading,
    addStudent,
    addWeeklyTest,
    addTestResult,
    addXp,
    awardXP,
    removeStudent,
    assignTeam,
    buyReward,
    useReward,
  };
}
