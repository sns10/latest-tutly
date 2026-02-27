import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentAttendance } from '@/types';
import { toast } from 'sonner';

const STALE_TIME = 2 * 60 * 1000; // 2 minutes for attendance (more volatile)
const GC_TIME = 15 * 60 * 1000; // 15 minutes

interface AttendanceFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  studentId?: string;
  classFilter?: string;
}

const formatAttendance = (data: any[]): StudentAttendance[] => {
  return data.map((attendance) => ({
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
};

// Optimized: Only fetch attendance for specific date or short date range
export function useAttendanceQuery(tuitionId: string | null, filters?: AttendanceFilters) {
  const queryKey = ['attendance', tuitionId, filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!tuitionId) return [];

      // Default to last 30 days if no specific date provided
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('student_attendance')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply date filters
      if (filters?.date) {
        // Single date - most efficient
        query = query.eq('date', filters.date);
      } else if (filters?.startDate && filters?.endDate) {
        query = query.gte('date', filters.startDate).lte('date', filters.endDate);
      } else {
        // Default: last 30 days only
        query = query.gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
      }

      // Apply student filter if provided
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      // Limit to prevent over-fetching
      query = query.limit(1000);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching attendance:', error);
        throw error;
      }

      return formatAttendance(data || []);
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// For reports and historical views - fetches based on date range from filters
// Uses pagination to fetch ALL records (Supabase default limit is 1000)
export function useHistoricalAttendanceQuery(tuitionId: string | null, startDate?: string, endDate?: string) {
  const queryKey = ['attendance', tuitionId, 'historical', startDate, endDate];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!tuitionId) return [];

      const allRecords: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;

      const MAX_RECORDS = 5000;
      while (hasMore && allRecords.length < MAX_RECORDS) {
        let query = supabase
          .from('student_attendance')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        // Apply date range if provided
        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching historical attendance:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allRecords.push(...data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return formatAttendance(allRecords);
    },
    enabled: !!tuitionId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes for historical data
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

// For student details - fetches all attendance for a specific student
export function useStudentAttendanceQuery(tuitionId: string | null, studentId: string | null) {
  const queryKey = ['attendance', tuitionId, 'student', studentId];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!tuitionId || !studentId) return [];

      const { data, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching student attendance:', error);
        throw error;
      }

      return formatAttendance(data || []);
    },
    enabled: !!tuitionId && !!studentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// For current day attendance - most common use case
export function useTodayAttendanceQuery(tuitionId: string | null) {
  const today = new Date().toISOString().split('T')[0];
  return useAttendanceQuery(tuitionId, { date: today });
}

export function useMarkAttendanceMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      date: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      notes?: string;
      subjectId?: string;
      facultyId?: string;
    }) => {
      const { studentId, date, status, notes, subjectId, facultyId } = params;
      
      const normalizedSubjectId = subjectId?.trim() || null;
      const normalizedFacultyId = facultyId?.trim() || null;

      // Build query to check existing
      let query = supabase
        .from('student_attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', date);

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

      const { data: existing, error: checkError } = await query.maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        const { error } = await supabase
          .from('student_attendance')
          .update({
            status,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
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

        if (error) throw error;
      }

      return { studentId, date, status, notes, subjectId: normalizedSubjectId, facultyId: normalizedFacultyId };
    },
    // Optimistic update for instant UI feedback
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['attendance', tuitionId] });

      // Snapshot previous value
      const previousAttendance = queryClient.getQueryData<StudentAttendance[]>(['attendance', tuitionId, undefined]);

      // Optimistically update the cache
      if (previousAttendance) {
        const { studentId, date, status, notes, subjectId, facultyId } = params;
        const normalizedSubjectId = subjectId?.trim() || null;
        const normalizedFacultyId = facultyId?.trim() || null;
        
        const existingIndex = previousAttendance.findIndex(a => 
          a.studentId === studentId && 
          a.date === date &&
          (normalizedSubjectId ? a.subjectId === normalizedSubjectId : !a.subjectId) &&
          (normalizedFacultyId ? a.facultyId === normalizedFacultyId : !a.facultyId)
        );

        const newAttendance = [...previousAttendance];
        const now = new Date().toISOString();

        if (existingIndex >= 0) {
          // Update existing
          newAttendance[existingIndex] = {
            ...newAttendance[existingIndex],
            status: status as 'present' | 'absent' | 'late' | 'excused',
            notes,
            updatedAt: now,
          };
        } else {
          // Add new
          newAttendance.unshift({
            id: `temp-${Date.now()}`,
            studentId,
            date,
            status: status as 'present' | 'absent' | 'late' | 'excused',
            notes,
            subjectId: normalizedSubjectId || undefined,
            facultyId: normalizedFacultyId || undefined,
            createdAt: now,
            updatedAt: now,
          });
        }

        queryClient.setQueryData(['attendance', tuitionId, undefined], newAttendance);
      }

      return { previousAttendance };
    },
    onError: (error, _params, context) => {
      // Rollback on error
      if (context?.previousAttendance) {
        queryClient.setQueryData(['attendance', tuitionId, undefined], context.previousAttendance);
      }
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    },
    onSettled: () => {
      // Refetch in background to ensure sync (but UI already updated)
      queryClient.invalidateQueries({ 
        queryKey: ['attendance', tuitionId],
        refetchType: 'none' // Don't refetch immediately, just mark stale
      });
    },
  });
}

// Bulk mark attendance for efficiency
export function useBulkMarkAttendanceMutation(tuitionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: Array<{
      studentId: string;
      date: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      notes?: string;
      subjectId?: string;
      facultyId?: string;
    }>) => {
      const upsertRecords = records.map(r => ({
        student_id: r.studentId,
        date: r.date,
        status: r.status,
        notes: r.notes || null,
        subject_id: r.subjectId?.trim() || null,
        faculty_id: r.facultyId?.trim() || null,
      }));

      const { error } = await supabase
        .from('student_attendance')
        .upsert(upsertRecords, { 
          onConflict: 'student_id,date,subject_id,faculty_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      return records;
    },
    // Optimistic update for bulk operations
    onMutate: async (records) => {
      await queryClient.cancelQueries({ queryKey: ['attendance', tuitionId] });
      
      const previousAttendance = queryClient.getQueryData<StudentAttendance[]>(['attendance', tuitionId, undefined]);

      if (previousAttendance) {
        const newAttendance = [...previousAttendance];
        const now = new Date().toISOString();

        records.forEach(({ studentId, date, status, notes, subjectId, facultyId }) => {
          const normalizedSubjectId = subjectId?.trim() || null;
          const normalizedFacultyId = facultyId?.trim() || null;
          
          const existingIndex = newAttendance.findIndex(a => 
            a.studentId === studentId && 
            a.date === date &&
            (normalizedSubjectId ? a.subjectId === normalizedSubjectId : !a.subjectId) &&
            (normalizedFacultyId ? a.facultyId === normalizedFacultyId : !a.facultyId)
          );

          if (existingIndex >= 0) {
            newAttendance[existingIndex] = {
              ...newAttendance[existingIndex],
              status: status as 'present' | 'absent' | 'late' | 'excused',
              notes,
              updatedAt: now,
            };
          } else {
            newAttendance.unshift({
              id: `temp-${Date.now()}-${studentId}`,
              studentId,
              date,
              status: status as 'present' | 'absent' | 'late' | 'excused',
              notes,
              subjectId: normalizedSubjectId || undefined,
              facultyId: normalizedFacultyId || undefined,
              createdAt: now,
              updatedAt: now,
            });
          }
        });

        queryClient.setQueryData(['attendance', tuitionId, undefined], newAttendance);
      }

      return { previousAttendance };
    },
    onError: (error, _records, context) => {
      if (context?.previousAttendance) {
        queryClient.setQueryData(['attendance', tuitionId, undefined], context.previousAttendance);
      }
      console.error('Error bulk marking attendance:', error);
      toast.error('Failed to save attendance');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['attendance', tuitionId],
        refetchType: 'none'
      });
    },
  });
}
