import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import type { Tables } from '@/integrations/supabase/types';

type Student = Tables<'students'>;
type StudentAttendance = Tables<'student_attendance'>;
type StudentTestResult = Tables<'student_test_results'>;
type StudentFee = Tables<'student_fees'>;
type WeeklyTest = Tables<'weekly_tests'>;
type Subject = Tables<'subjects'>;
type Announcement = Tables<'announcements'>;

export function useStudentData() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [testResults, setTestResults] = useState<StudentTestResult[]>([]);
  const [tests, setTests] = useState<WeeklyTest[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First try to find student by user_id (already linked)
        let { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // If no student found by user_id, try to find by email and link
        if (!studentData && user.email) {
          const { data: studentByEmail, error: emailError } = await supabase
            .from('students')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();

          if (studentByEmail && !studentByEmail.user_id) {
            // Link the student to this user account
            const { data: updatedStudent, error: updateError } = await supabase
              .from('students')
              .update({ user_id: user.id })
              .eq('id', studentByEmail.id)
              .select()
              .single();

            if (!updateError && updatedStudent) {
              studentData = updatedStudent;
            }
          } else if (studentByEmail) {
            // Student already linked to another user
            studentData = studentByEmail;
          }
        }

        if (studentError) {
          console.error('Error fetching student:', studentError);
          setLoading(false);
          return;
        }
        if (!studentData) {
          // No student record for this user - this is normal for non-student users
          setLoading(false);
          return;
        }

        setStudent(studentData);

        // Fetch all related data in parallel
        const [
          attendanceRes,
          testResultsRes,
          testsRes,
          feesRes,
          subjectsRes,
          announcementsRes
        ] = await Promise.all([
          supabase
            .from('student_attendance')
            .select('*')
            .eq('student_id', studentData.id)
            .order('date', { ascending: false }),
          supabase
            .from('student_test_results')
            .select('*')
            .eq('student_id', studentData.id),
          supabase
            .from('weekly_tests')
            .select('*')
            .eq('tuition_id', studentData.tuition_id)
            .order('test_date', { ascending: false }),
          supabase
            .from('student_fees')
            .select('*')
            .eq('student_id', studentData.id)
            .order('due_date', { ascending: false }),
          supabase
            .from('subjects')
            .select('*')
            .eq('tuition_id', studentData.tuition_id)
            .eq('class', studentData.class),
          supabase
            .from('announcements')
            .select('*')
            .eq('tuition_id', studentData.tuition_id)
            .or(`target_class.eq.${studentData.class},target_class.is.null`)
            .order('published_at', { ascending: false })
        ]);

        if (attendanceRes.data) setAttendance(attendanceRes.data);
        if (testResultsRes.data) setTestResults(testResultsRes.data);
        if (testsRes.data) setTests(testsRes.data);
        if (feesRes.data) setFees(feesRes.data);
        if (subjectsRes.data) setSubjects(subjectsRes.data);
        if (announcementsRes.data) setAnnouncements(announcementsRes.data);

      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user]);

  return {
    student,
    attendance,
    testResults,
    tests,
    fees,
    subjects,
    announcements,
    loading
  };
}
