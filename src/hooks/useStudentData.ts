import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import type { Tables } from '@/integrations/supabase/types';
import { getCurrentAcademicYearStart, getDefaultAttendanceWindowStart } from '@/lib/dateWindows';

type Student = Tables<'students'>;
type StudentAttendance = Tables<'student_attendance'>;
type StudentTestResult = Tables<'student_test_results'>;
type StudentFee = Tables<'student_fees'>;
type FeePayment = Tables<'fee_payments'>;
type WeeklyTest = Tables<'weekly_tests'>;
type Subject = Tables<'subjects'>;
type Announcement = Tables<'announcements'>;
type Tuition = Tables<'tuitions'>;
type Homework = Tables<'homework'>;
type TermExam = Tables<'term_exams'>;
type TermExamSubject = Tables<'term_exam_subjects'>;
type TermExamResult = Tables<'term_exam_results'>;

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
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [termExams, setTermExams] = useState<TermExam[]>([]);
  const [termExamSubjects, setTermExamSubjects] = useState<(TermExamSubject & { subject?: Subject })[]>([]);
  const [termExamResults, setTermExamResults] = useState<TermExamResult[]>([]);
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
        
        // Fetch tuition info for individual student access
        const { data: studentTuitionData } = await supabase
          .from('tuitions')
          .select('*')
          .eq('id', studentData.tuition_id)
          .maybeSingle();
        
        if (studentTuitionData) {
          setTuition(studentTuitionData);
        }
        
        await fetchStudentRelatedData(studentData);

      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Helper: paginated fetch to avoid 1000-row silent cap
    const paginatedFetch = async (
      queryBuilder: () => ReturnType<ReturnType<typeof supabase.from>['select']>,
    ) => {
      const PAGE_SIZE = 1000;
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await queryBuilder().range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Paginated fetch error:', error); break; }
        if (data) allData.push(...data);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allData;
    };

    // Helper: derive overdue status for fees
    const deriveFeeStatus = (feesData: StudentFee[]): StudentFee[] => {
      const today = new Date().toISOString().split('T')[0];
      return feesData.map(fee => {
        if (fee.status === 'unpaid' && fee.due_date < today) {
          return { ...fee, status: 'overdue' };
        }
        return fee;
      });
    };

    const fetchStudentRelatedData = async (studentData: Student) => {
      const [
        attendanceData,
        testResultsData,
        testsData,
        feesRaw,
        subjectsRes,
        announcementsRes,
        homeworkRes,
        termExamsRes,
        termExamSubjectsRes,
        termExamResultsData
      ] = await Promise.all([
        paginatedFetch(() =>
          supabase.from('student_attendance').select('*')
            .eq('student_id', studentData.id)
            .gte('date', getDefaultAttendanceWindowStart(365))
            .order('date', { ascending: false })
        ),
        paginatedFetch(() =>
          supabase.from('student_test_results').select('*')
            .eq('student_id', studentData.id)
        ),
        paginatedFetch(() =>
          supabase.from('weekly_tests').select('*')
            .eq('tuition_id', studentData.tuition_id)
            .gte('test_date', getCurrentAcademicYearStart())
            .order('test_date', { ascending: false })
        ),
        paginatedFetch(() =>
          supabase.from('student_fees').select('*')
            .eq('student_id', studentData.id)
            .gte('due_date', getCurrentAcademicYearStart())
            .order('due_date', { ascending: false })
        ),
        supabase
          .from('subjects').select('*')
          .eq('tuition_id', studentData.tuition_id)
          .eq('class', studentData.class),
        supabase
          .from('announcements').select('*')
          .eq('tuition_id', studentData.tuition_id)
          .or(`target_class.eq.${studentData.class},target_class.is.null`)
          .order('published_at', { ascending: false }),
        supabase
          .from('homework').select('*')
          .eq('tuition_id', studentData.tuition_id)
          .eq('class', studentData.class)
          .order('due_date', { ascending: true }),
        supabase
          .from('term_exams').select('*')
          .eq('tuition_id', studentData.tuition_id)
          .eq('class', studentData.class)
          .order('created_at', { ascending: false }),
        supabase
          .from('term_exam_subjects')
          .select('*, subject:subjects(id, name, class)')
          .order('created_at', { ascending: true }),
        paginatedFetch(() =>
          supabase.from('term_exam_results').select('*')
            .eq('student_id', studentData.id)
        ),
      ]);

      setAttendance(attendanceData);
      setTestResults(testResultsData);
      setTests(testsData);
      
      // Derive overdue status for fees
      const feesData = deriveFeeStatus(feesRaw as StudentFee[]);
      setFees(feesData);
      // Fetch fee payments for all fees
      const feeIds = feesData.map(f => f.id);
      if (feeIds.length > 0) {
        const paymentsData = await paginatedFetch(() =>
          supabase.from('fee_payments').select('*')
            .in('fee_id', feeIds)
            .order('payment_date', { ascending: false })
        );
        setFeePayments(paymentsData);
      }
      
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (homeworkRes.data) setHomework(homeworkRes.data);
      if (termExamsRes.data) setTermExams(termExamsRes.data);
      if (termExamSubjectsRes.data) setTermExamSubjects(termExamSubjectsRes.data as any);
      setTermExamResults(termExamResultsData);
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
    feePayments,
    subjects,
    announcements,
    homework,
    termExams,
    termExamSubjects,
    termExamResults,
    loading
  };
}