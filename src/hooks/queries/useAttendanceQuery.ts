import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentAttendance } from '@/types';
import { toast } from 'sonner';
import { formatLocalDate } from '@/lib/dateWindows';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes - balanced cache to reduce cloud calls
const GC_TIME = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Network-resilience layer for attendance saves
//
// On iPhone Safari (during/after a phone call the tab is suspended) and on
// low-bandwidth Android (VoLTE bursts briefly drop the radio), TanStack's
// `refetchOnReconnect` keeps firing full 30-day attendance refetches. Those
// refetches started with a stale Postgres snapshot, so when they finally
// resolve they overwrite the cache and wipe both optimistic state AND
// already-merged saved rows — the "save vanished after a second" glitch the
// user reported.
//
// Mitigation: `recentlySavedRows` — every successfully saved row is kept in
// memory with a TTL. Any attendance fetch result is reconciled against this
// buffer before being committed, so a stale snapshot can never hide a row
// the user just saved. Combined with `refetchOnReconnect: false` and
// `networkMode: 'online'` on the attendance queries this prevents the
// "save vanishes after a second" glitch on iPhone Safari / weak networks.
// ---------------------------------------------------------------------------

type AttendanceKey = string; // `${tuitionId}|${studentId}|${date}|${subjectId??''}|${facultyId??''}`
const SAVED_ROW_TTL_MS = 90 * 1000;
const recentlySavedRows = new Map<AttendanceKey, { row: StudentAttendance; expiresAt: number }>();

const rowKey = (tuitionId: string | null, r: { studentId: string; date: string; subjectId?: string | null; facultyId?: string | null }) =>
  `${tuitionId ?? ''}|${r.studentId}|${r.date}|${r.subjectId ?? ''}|${r.facultyId ?? ''}`;

const rememberSavedRows = (tuitionId: string | null, rows: StudentAttendance[]) => {
  const expiresAt = Date.now() + SAVED_ROW_TTL_MS;
  rows.forEach(row => recentlySavedRows.set(rowKey(tuitionId, row), { row, expiresAt }));
};

/** Merge any in-memory saved rows the server hasn't echoed yet into a freshly
 *  fetched attendance list. Drops expired entries as a side effect. */
const reconcileWithRecentSaves = (tuitionId: string | null, fetched: StudentAttendance[]): StudentAttendance[] => {
  if (recentlySavedRows.size === 0) return fetched;
  const now = Date.now();
  const fetchedByKey = new Map<AttendanceKey, number>();
  fetched.forEach((row, idx) => fetchedByKey.set(rowKey(tuitionId, row), idx));

  const out = [...fetched];
  recentlySavedRows.forEach((entry, key) => {
    if (entry.expiresAt < now) {
      recentlySavedRows.delete(key);
      return;
    }
    // Only reconcile entries for this tuition (key is prefixed with tuitionId).
    if (!key.startsWith(`${tuitionId ?? ''}|`)) return;
    const idx = fetchedByKey.get(key);
    if (idx === undefined) {
      out.unshift(entry.row);
    } else {
      // Server snapshot may be older than the in-memory row — prefer the more
      // recent updatedAt so we never overwrite a fresh save with a stale read.
      const existing = out[idx];
      const existingTs = Date.parse(existing.updatedAt || existing.createdAt || '') || 0;
      const savedTs = Date.parse(entry.row.updatedAt || entry.row.createdAt || '') || 0;
      if (savedTs >= existingTs) out[idx] = { ...existing, ...entry.row };
    }
  });
  return out;
};

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
    subjectId: attendance.subject_id ?? undefined,
    facultyId: attendance.faculty_id ?? undefined,
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
      
      // Paginated fetch to avoid silent data truncation
      const allData: any[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;

      // Loop until the page is short (no silent record cap).
      // Bounded by the date filter applied below (default: last 30 days).
      while (true) {
        let query = supabase
          .from('student_attendance')
          .select('*, students!inner(tuition_id)')
          .eq('students.tuition_id', tuitionId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        // Apply date filters
        if (filters?.date) {
          query = query.eq('date', filters.date);
        } else if (filters?.startDate && filters?.endDate) {
          query = query.gte('date', filters.startDate).lte('date', filters.endDate);
        } else {
          query = query.gte('date', formatLocalDate(thirtyDaysAgo));
        }

        if (filters?.studentId) {
          query = query.eq('student_id', filters.studentId);
        }

        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching attendance:', error);
          throw error;
        }

        allData.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return reconcileWithRecentSaves(tuitionId, formatAttendance(allData));
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    // Low-bandwidth / iPhone-call resilience: an in-flight tab suspension
    // or radio drop must not trigger a 30-day refetch that could wipe a
    // freshly-saved attendance row.
    refetchOnReconnect: false,
    networkMode: 'online',
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

      // Bounded by required date range (this hook only runs when start+end are set).
      while (hasMore) {
        let query = supabase
          .from('student_attendance')
          .select('*, students!inner(tuition_id)')
          .eq('students.tuition_id', tuitionId)
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

// On-demand report query — NO record cap, only fires when manually triggered
export function useReportAttendanceQuery(tuitionId: string | null, startDate?: string, endDate?: string) {
  const queryKey = ['attendance', tuitionId, 'report', startDate, endDate];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!tuitionId) return [];

      const allRecords: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('student_attendance')
          .select('id, student_id, date, status, notes, subject_id, faculty_id, created_at, updated_at, students!inner(tuition_id)')
          .eq('students.tuition_id', tuitionId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching report attendance:', error);
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
    enabled: false, // Only runs when refetch() is called
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// For student details - fetches all attendance for a specific student
export function useStudentAttendanceQuery(tuitionId: string | null, studentId: string | null) {
  const queryKey = ['attendance', tuitionId, 'student', studentId];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!tuitionId || !studentId) return [];

      const allData: any[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('student_attendance')
          .select('*, students!inner(tuition_id)')
          .eq('students.tuition_id', tuitionId)
          .eq('student_id', studentId)
          .order('date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching student attendance:', error);
          throw error;
        }

        allData.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return formatAttendance(allData);
    },
    enabled: !!tuitionId && !!studentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnReconnect: false,
    networkMode: 'online',
  });
}

// For current day attendance - most common use case
export function useTodayAttendanceQuery(tuitionId: string | null) {
  const today = formatLocalDate(new Date());
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

      // Use limit(1) instead of maybeSingle() — maybeSingle() THROWS on duplicate
      // rows, which historically broke the whole flow and rolled back the optimistic
      // green state. limit(1) tolerates accidental duplicates while we still pick a
      // deterministic existing row to update.
      const { data: existingRows, error: checkError } = await query
        .order('created_at', { ascending: true })
        .limit(1);

      if (checkError) throw checkError;

      const existing = existingRows && existingRows[0];

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

      // Snapshot ALL attendance cache entries for this tuition (any filter variant)
      const snapshots = queryClient.getQueriesData<StudentAttendance[]>({
        queryKey: ['attendance', tuitionId],
      });

      const { studentId, date, status, notes, subjectId, facultyId } = params;
      const normalizedSubjectId = subjectId?.trim() || null;
      const normalizedFacultyId = facultyId?.trim() || null;
      const now = new Date().toISOString();
      const tempId = `temp-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;

      snapshots.forEach(([key, previous]) => {
        if (!Array.isArray(previous)) return;

        const existingIndex = previous.findIndex(a =>
          a.studentId === studentId &&
          a.date === date &&
          (normalizedSubjectId ? a.subjectId === normalizedSubjectId : !a.subjectId) &&
          (normalizedFacultyId ? a.facultyId === normalizedFacultyId : !a.facultyId)
        );

        const next = [...previous];
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            status: status as 'present' | 'absent' | 'late' | 'excused',
            notes,
            updatedAt: now,
          };
        } else {
          next.unshift({
            id: tempId,
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
        queryClient.setQueryData(key, next);
      });

      return { snapshots };
    },
    onError: (error, _params, context) => {
      // Rollback all snapshots on error
      context?.snapshots?.forEach(([key, previous]) => {
        queryClient.setQueryData(key, previous);
      });
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    },
    onSuccess: (saved) => {
      // Remember this save so any in-flight or imminent refetch that returns
      // a stale snapshot (Postgres replica lag, slow 4G, iPhone tab suspend)
      // can still reconcile the row back in via `reconcileWithRecentSaves`.
      const now = new Date().toISOString();
      rememberSavedRows(tuitionId, [{
        id: `recent-${saved.studentId}-${saved.date}`,
        studentId: saved.studentId,
        date: saved.date,
        status: saved.status,
        notes: saved.notes,
        subjectId: saved.subjectId ?? undefined,
        facultyId: saved.facultyId ?? undefined,
        createdAt: now,
        updatedAt: now,
      }]);
    },
    onSettled: () => {
      // Mark caches stale WITHOUT forcing an immediate refetch — the optimistic
      // dot stays on screen until the next mount/focus instead of flickering
      // back to "unmarked" while a 30-day pagination refetch is in flight.
      queryClient.invalidateQueries({ queryKey: ['attendance', tuitionId], refetchType: 'none' });
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
      // Single-call set-based upsert via SECURITY DEFINER RPC. Replaces the
      // previous N-round-trip loop (select-then-insert/update per student)
      // which made "Mark All Present" take 10–30s on a real mobile network.
      const payload = records.map(r => ({
        student_id: r.studentId,
        date: r.date,
        status: r.status,
        notes: r.notes ?? null,
        subject_id: r.subjectId?.trim() || null,
        faculty_id: r.facultyId?.trim() || null,
      }));

      const { data, error } = await supabase.rpc('bulk_mark_attendance', { _records: payload });
      if (error) throw error;
      return formatAttendance(data || []);
    },
    // Optimistic update for bulk operations
    onMutate: async (records) => {
      await queryClient.cancelQueries({ queryKey: ['attendance', tuitionId] });

      const snapshots = queryClient.getQueriesData<StudentAttendance[]>({
        queryKey: ['attendance', tuitionId],
      });
      const now = new Date().toISOString();
      const makeTempId = () =>
        `temp-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;

      snapshots.forEach(([key, previous]) => {
        if (!Array.isArray(previous)) return;
        const next = [...previous];

        records.forEach(({ studentId, date, status, notes, subjectId, facultyId }) => {
          const normalizedSubjectId = subjectId?.trim() || null;
          const normalizedFacultyId = facultyId?.trim() || null;

          const existingIndex = next.findIndex(a =>
            a.studentId === studentId &&
            a.date === date &&
            (normalizedSubjectId ? a.subjectId === normalizedSubjectId : !a.subjectId) &&
            (normalizedFacultyId ? a.facultyId === normalizedFacultyId : !a.facultyId)
          );

          if (existingIndex >= 0) {
            next[existingIndex] = {
              ...next[existingIndex],
              status: status as 'present' | 'absent' | 'late' | 'excused',
              notes,
              updatedAt: now,
            };
          } else {
            next.unshift({
              id: makeTempId(),
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

        queryClient.setQueryData(key, next);
      });

      return { snapshots };
    },
    onError: (error, _records, context) => {
      context?.snapshots?.forEach(([key, previous]) => {
        queryClient.setQueryData(key, previous);
      });
      console.error('Error bulk marking attendance:', error);
      toast.error('Failed to save attendance');
    },
    onSuccess: (savedRows) => {
      // Merge real rows into every cached attendance list, replacing matching
      // optimistic temp entries so the green dots stay on screen seamlessly.
      if (!Array.isArray(savedRows) || savedRows.length === 0) {
        toast.error('Failed to save attendance');
        return;
      }
      const caches = queryClient.getQueriesData<StudentAttendance[]>({
        queryKey: ['attendance', tuitionId],
      });
      caches.forEach(([key, previous]) => {
        if (!Array.isArray(previous)) return;
        const next = [...previous];
        savedRows.forEach((row) => {
          const idx = next.findIndex(a =>
            a.studentId === row.studentId &&
            a.date === row.date &&
            (a.subjectId ?? null) === (row.subjectId ?? null) &&
            (a.facultyId ?? null) === (row.facultyId ?? null)
          );
          if (idx >= 0) next[idx] = { ...next[idx], ...row };
          else next.unshift(row);
        });
        queryClient.setQueryData(key, next);
      });
      toast.success(`${savedRows.length} student${savedRows.length === 1 ? '' : 's'} saved`);
    },
    onSettled: () => {
      // Stale-mark only — do not trigger an immediate refetch that would visibly
      // wipe the optimistic / freshly-merged rows.
      queryClient.invalidateQueries({ queryKey: ['attendance', tuitionId], refetchType: 'none' });
    },
  });
}
