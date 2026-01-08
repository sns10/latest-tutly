import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TermExam, TermExamSubject, TermExamResult, ClassName, Subject } from '@/types';
import { toast } from 'sonner';
import { useUserTuition } from './useUserTuition';

export function useTermExamData() {
  const { tuitionId } = useUserTuition();
  const [termExams, setTermExams] = useState<TermExam[]>([]);
  const [termExamSubjects, setTermExamSubjects] = useState<TermExamSubject[]>([]);
  const [termExamResults, setTermExamResults] = useState<TermExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tuitionId) {
      fetchAllTermExamData();
    }
  }, [tuitionId]);

  const fetchAllTermExamData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTermExams(),
        fetchTermExamSubjects(),
        fetchTermExamResults()
      ]);
    } catch (error) {
      console.error('Error fetching term exam data:', error);
      toast.error('Failed to load term exam data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTermExams = async () => {
    const { data, error } = await supabase
      .from('term_exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching term exams:', error);
      return;
    }

    const formatted: TermExam[] = data.map(exam => ({
      id: exam.id,
      name: exam.name,
      term: exam.term as '1st Term' | '2nd Term' | '3rd Term',
      class: exam.class as ClassName,
      academicYear: exam.academic_year,
      startDate: exam.start_date,
      endDate: exam.end_date,
      createdAt: exam.created_at,
      updatedAt: exam.updated_at,
    }));

    setTermExams(formatted);
  };

  const fetchTermExamSubjects = async () => {
    const { data, error } = await supabase
      .from('term_exam_subjects')
      .select(`
        *,
        subject:subjects (id, name, class)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching term exam subjects:', error);
      return;
    }

    const formatted: TermExamSubject[] = data.map(item => ({
      id: item.id,
      termExamId: item.term_exam_id,
      subjectId: item.subject_id,
      maxMarks: item.max_marks,
      examDate: item.exam_date,
      subject: item.subject ? {
        id: item.subject.id,
        name: item.subject.name,
        class: item.subject.class as ClassName,
        createdAt: '',
      } : undefined,
      createdAt: item.created_at,
    }));

    setTermExamSubjects(formatted);
  };

  const fetchTermExamResults = async () => {
    if (!tuitionId) return;
    
    // Paginate to avoid row limits, filter by tuition via term_exams join
    const PAGE_SIZE = 1000;
    const allResults: TermExamResult[] = [];
    
    for (let page = 0; page < 50; page++) {
      const { data, error } = await supabase
        .from('term_exam_results')
        .select('*, term_exams!inner(tuition_id)')
        .eq('term_exams.tuition_id', tuitionId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching term exam results:', error);
        return;
      }

      const rows = (data ?? []) as any[];
      allResults.push(
        ...rows.map(result => ({
          id: result.id,
          termExamId: result.term_exam_id,
          studentId: result.student_id,
          subjectId: result.subject_id,
          marks: result.marks,
          grade: result.grade,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
        }))
      );

      if (rows.length < PAGE_SIZE) break;
    }

    setTermExamResults(allResults);
  };

  const addTermExam = async (exam: {
    name: string;
    term: '1st Term' | '2nd Term' | '3rd Term';
    class: ClassName;
    academicYear: string;
    startDate?: string;
    endDate?: string;
    subjects: { subjectId: string; maxMarks: number; examDate?: string }[];
  }) => {
    if (!tuitionId) return null;

    const { data, error } = await supabase
      .from('term_exams')
      .insert({
        name: exam.name,
        term: exam.term,
        class: exam.class,
        academic_year: exam.academicYear,
        start_date: exam.startDate,
        end_date: exam.endDate,
        tuition_id: tuitionId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating term exam:', error);
      toast.error('Failed to create term exam');
      return null;
    }

    // Add subjects for this exam
    if (exam.subjects.length > 0) {
      const subjectsToInsert = exam.subjects.map(s => ({
        term_exam_id: data.id,
        subject_id: s.subjectId,
        max_marks: s.maxMarks,
        exam_date: s.examDate,
      }));

      const { error: subjectsError } = await supabase
        .from('term_exam_subjects')
        .insert(subjectsToInsert);

      if (subjectsError) {
        console.error('Error adding term exam subjects:', subjectsError);
        toast.error('Failed to add subjects to exam');
      }
    }

    await fetchAllTermExamData();
    toast.success(`Term exam "${exam.name}" created successfully!`);
    return data.id;
  };

  const deleteTermExam = async (examId: string) => {
    // Delete results first
    await supabase
      .from('term_exam_results')
      .delete()
      .eq('term_exam_id', examId);

    // Delete subjects
    await supabase
      .from('term_exam_subjects')
      .delete()
      .eq('term_exam_id', examId);

    // Delete exam
    const { error } = await supabase
      .from('term_exams')
      .delete()
      .eq('id', examId);

    if (error) {
      console.error('Error deleting term exam:', error);
      toast.error('Failed to delete term exam');
      return;
    }

    await fetchAllTermExamData();
    toast.success('Term exam deleted successfully!');
  };

  const addTermExamResult = async (result: {
    termExamId: string;
    studentId: string;
    subjectId: string;
    marks?: number;
    grade?: string;
  }) => {
    const { error } = await supabase
      .from('term_exam_results')
      .upsert({
        term_exam_id: result.termExamId,
        student_id: result.studentId,
        subject_id: result.subjectId,
        marks: result.marks,
        grade: result.grade,
      }, {
        onConflict: 'term_exam_id,student_id,subject_id'
      });

    if (error) {
      console.error('Error adding term exam result:', error);
      toast.error('Failed to save result');
      return;
    }

    await fetchTermExamResults();
  };

  const bulkAddTermExamResults = async (results: {
    termExamId: string;
    studentId: string;
    subjectId: string;
    marks?: number;
    grade?: string;
  }[]) => {
    const toInsert = results.map(r => ({
      term_exam_id: r.termExamId,
      student_id: r.studentId,
      subject_id: r.subjectId,
      marks: r.marks,
      grade: r.grade,
    }));

    const { error } = await supabase
      .from('term_exam_results')
      .upsert(toInsert, {
        onConflict: 'term_exam_id,student_id,subject_id'
      });

    if (error) {
      console.error('Error bulk adding term exam results:', error);
      toast.error('Failed to save results');
      return false;
    }

    await fetchTermExamResults();
    return true;
  };

  return {
    termExams,
    termExamSubjects,
    termExamResults,
    loading,
    addTermExam,
    deleteTermExam,
    addTermExamResult,
    bulkAddTermExamResults,
    refetch: fetchAllTermExamData,
  };
}
