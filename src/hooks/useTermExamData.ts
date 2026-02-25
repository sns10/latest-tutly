import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TermExam, TermExamSubject, TermExamResult, ClassName } from '@/types';
import { toast } from 'sonner';
import { useUserTuition } from './useUserTuition';

const CHUNK_SIZE = 300;
const STALE_TIME = 10 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

export function useTermExamData() {
  const { tuitionId } = useUserTuition();
  const queryClient = useQueryClient();

  const { data: termExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['termExams', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];
      const { data, error } = await supabase
        .from('term_exams')
        .select('*')
        .eq('tuition_id', tuitionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(exam => ({
        id: exam.id, name: exam.name,
        term: exam.term as '1st Term' | '2nd Term' | '3rd Term',
        class: exam.class as ClassName, academicYear: exam.academic_year,
        startDate: exam.start_date, endDate: exam.end_date,
        createdAt: exam.created_at, updatedAt: exam.updated_at,
      })) as TermExam[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const { data: termExamSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['termExamSubjects', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];
      const { data, error } = await supabase
        .from('term_exam_subjects')
        .select(`*, subject:subjects (id, name, class), term_exams!inner(tuition_id)`)
        .eq('term_exams.tuition_id', tuitionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(item => ({
        id: item.id, termExamId: item.term_exam_id, subjectId: item.subject_id,
        maxMarks: item.max_marks, examDate: item.exam_date,
        subject: item.subject ? { id: item.subject.id, name: item.subject.name, class: item.subject.class as ClassName, createdAt: '' } : undefined,
        createdAt: item.created_at,
      })) as TermExamSubject[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const { data: termExamResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['termExamResults', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];
      const { data, error } = await supabase
        .from('term_exam_results')
        .select('*, term_exams!inner(tuition_id)')
        .eq('term_exams.tuition_id', tuitionId)
        .limit(5000);
      if (error) throw error;
      return (data ?? []).map((result: any) => ({
        id: result.id, termExamId: result.term_exam_id, studentId: result.student_id,
        subjectId: result.subject_id, marks: result.marks, grade: result.grade,
        createdAt: result.created_at, updatedAt: result.updated_at,
      })) as TermExamResult[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const loading = examsLoading || subjectsLoading || resultsLoading;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['termExams', tuitionId] });
    queryClient.invalidateQueries({ queryKey: ['termExamSubjects', tuitionId] });
    queryClient.invalidateQueries({ queryKey: ['termExamResults', tuitionId] });
  }, [queryClient, tuitionId]);

  const addTermExam = async (exam: {
    name: string; term: '1st Term' | '2nd Term' | '3rd Term'; class: ClassName;
    academicYear: string; startDate?: string; endDate?: string;
    subjects: { subjectId: string; maxMarks: number; examDate?: string }[];
  }) => {
    if (!tuitionId) return null;
    const { data, error } = await supabase.from('term_exams')
      .insert({ name: exam.name, term: exam.term, class: exam.class, academic_year: exam.academicYear, start_date: exam.startDate, end_date: exam.endDate, tuition_id: tuitionId })
      .select().single();
    if (error) { toast.error('Failed to create term exam'); return null; }
    if (exam.subjects.length > 0) {
      const { error: subjectsError } = await supabase.from('term_exam_subjects')
        .insert(exam.subjects.map(s => ({ term_exam_id: data.id, subject_id: s.subjectId, max_marks: s.maxMarks, exam_date: s.examDate })));
      if (subjectsError) toast.error('Failed to add subjects to exam');
    }
    invalidateAll();
    toast.success(`Term exam "${exam.name}" created successfully!`);
    return data.id;
  };

  const deleteTermExam = async (examId: string) => {
    await supabase.from('term_exam_results').delete().eq('term_exam_id', examId);
    await supabase.from('term_exam_subjects').delete().eq('term_exam_id', examId);
    const { error } = await supabase.from('term_exams').delete().eq('id', examId);
    if (error) { toast.error('Failed to delete term exam'); return; }
    invalidateAll();
    toast.success('Term exam deleted successfully!');
  };

  const addTermExamResult = async (result: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }) => {
    const { error } = await supabase.from('term_exam_results')
      .upsert({ term_exam_id: result.termExamId, student_id: result.studentId, subject_id: result.subjectId, marks: result.marks, grade: result.grade }, { onConflict: 'term_exam_id,student_id,subject_id' });
    if (error) { toast.error('Failed to save result'); return; }
    queryClient.invalidateQueries({ queryKey: ['termExamResults', tuitionId] });
  };

  const bulkAddTermExamResults = async (results: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }[]) => {
    const toInsert = results.map(r => ({ term_exam_id: r.termExamId, student_id: r.studentId, subject_id: r.subjectId, marks: r.marks, grade: r.grade }));
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const { error } = await supabase.from('term_exam_results').upsert(toInsert.slice(i, i + CHUNK_SIZE), { onConflict: 'term_exam_id,student_id,subject_id' });
      if (error) { toast.error('Failed to save results'); return false; }
    }
    queryClient.invalidateQueries({ queryKey: ['termExamResults', tuitionId] });
    toast.success(`Successfully saved ${results.length} marks!`);
    return true;
  };

  return { termExams, termExamSubjects, termExamResults, loading, addTermExam, deleteTermExam, addTermExamResult, bulkAddTermExamResults, refetch: invalidateAll };
}
