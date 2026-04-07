import { useUserTuition } from '@/hooks/useUserTuition';
import {
  useStudentsQuery,
  useDivisionsQuery,
  useSubjectsQuery,
  useFacultyQuery,
  useAttendanceQuery,
  useTimetableQuery,
  useMarkAttendanceMutation,
  useBulkMarkAttendanceMutation,
} from '@/hooks/queries';
import { AttendanceTracker } from '@/components/AttendanceTracker';
import { Loader2 } from 'lucide-react';
import { useCallback } from 'react';

export default function AttendancePage() {
  const { tuitionId } = useUserTuition();

  const { data: students = [], isLoading: studentsLoading } = useStudentsQuery(tuitionId);
  const { data: divisions = [] } = useDivisionsQuery(tuitionId);
  const { data: subjects = [] } = useSubjectsQuery(tuitionId);
  const { data: faculty = [] } = useFacultyQuery(tuitionId);
  const { data: attendance = [] } = useAttendanceQuery(tuitionId);
  const { data: timetable = [] } = useTimetableQuery(tuitionId);

  const markAttendanceMutation = useMarkAttendanceMutation(tuitionId);
  const bulkMarkAttendanceMutation = useBulkMarkAttendanceMutation(tuitionId);

  const markAttendance = useCallback((
    studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused',
    notes?: string, subjectId?: string, facultyId?: string
  ) => {
    markAttendanceMutation.mutate({ studentId, date, status, notes, subjectId, facultyId });
  }, [markAttendanceMutation]);

  const bulkMarkAttendance = useCallback((
    records: Array<{ studentId: string; date: string; status: 'present' | 'absent' | 'late' | 'excused'; notes?: string; subjectId?: string; facultyId?: string }>
  ) => {
    bulkMarkAttendanceMutation.mutate(records);
  }, [bulkMarkAttendanceMutation]);

  if (studentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AttendanceTracker
      students={students}
      attendance={attendance}
      timetable={timetable}
      subjects={subjects}
      faculty={faculty}
      divisions={divisions}
      onMarkAttendance={markAttendance}
      onBulkMarkAttendance={bulkMarkAttendance}
    />
  );
}
