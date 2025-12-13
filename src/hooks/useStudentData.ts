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
type Tuition = Tables<'tuitions'>;
type Homework = Tables<'homework'>;
interface Division {
  id: string;
  name: string;
}

interface StudentWithDivision extends Student {
  divisions?: Division | null;
}

export function useStudentData(selectedStudentId?: string | null) {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [allStudents, setAllStudents] = useState<StudentWithDivision[]>([]);
  const [tuition, setTuition] = useState<Tuition | null>(null);
  const [isSharedAccess, setIsSharedAccess] = useState(false);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [testResults, setTestResults] = useState<StudentTestResult[]>([]);
  const [tests, setTests] = useState<WeeklyTest[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First check if this is shared portal access (email matches tuition's portal_email)
        const { data: tuitionData } = await supabase
          .from('tuitions')
          .select('*')
          .eq('portal_email', user.email || '')
          .maybeSingle();

        if (tuitionData) {
          // Shared access mode - fetch all students for this tuition
          setIsSharedAccess(true);
          setTuition(tuitionData);

          const { data: studentsData } = await supabase
            .from('students')
            .select('*, divisions(id, name)')
            .eq('tuition_id', tuitionData.id)
            .order('name');

          if (studentsData) {
            setAllStudents(studentsData as StudentWithDivision[]);
          }

          // If a student is selected, fetch their data
          if (selectedStudentId) {
            const selectedStudent = studentsData?.find(s => s.id === selectedStudentId);
            if (selectedStudent) {
              setStudent(selectedStudent);
              await fetchStudentRelatedData(selectedStudent);
            }
          }

          setLoading(false);
          return;
        }

        // Individual access mode - try to find student by user_id
        let { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // If no student found by user_id, try to find by email and link
        if (!studentData && user.email) {
          const { data: studentByEmail } = await supabase
            .from('students')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();

          if (studentByEmail && !studentByEmail.user_id) {
            const { data: updatedStudent } = await supabase
              .from('students')
              .update({ user_id: user.id })
              .eq('id', studentByEmail.id)
              .select()
              .single();

            if (updatedStudent) {
              studentData = updatedStudent;
            }
          } else if (studentByEmail) {
            studentData = studentByEmail;
          }
        }

        if (!studentData) {
          setLoading(false);
          return;
        }

        setStudent(studentData);
        await fetchStudentRelatedData(studentData);

      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchStudentRelatedData = async (studentData: Student) => {
      const [
        attendanceRes,
        testResultsRes,
        testsRes,
        feesRes,
        subjectsRes,
        announcementsRes,
        homeworkRes
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
          .order('published_at', { ascending: false }),
        supabase
          .from('homework')
          .select('*')
          .eq('tuition_id', studentData.tuition_id)
          .eq('class', studentData.class)
          .order('due_date', { ascending: true })
      ]);

      if (attendanceRes.data) setAttendance(attendanceRes.data);
      if (testResultsRes.data) setTestResults(testResultsRes.data);
      if (testsRes.data) setTests(testsRes.data);
      if (feesRes.data) setFees(feesRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (homeworkRes.data) setHomework(homeworkRes.data);
    };

    fetchStudentData();
  }, [user, selectedStudentId]);

  return {
    student,
    allStudents,
    tuition,
    isSharedAccess,
    attendance,
    testResults,
    tests,
    fees,
    subjects,
    announcements,
    homework,
    loading
  };
}