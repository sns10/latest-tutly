import { useSupabaseData } from '@/hooks/useSupabaseData';
import { AttendanceTracker } from '@/components/AttendanceTracker';
import { Loader2 } from 'lucide-react';

export default function AttendancePage() {
  const { 
    students, 
    attendance,
    timetable,
    subjects,
    faculty,
    divisions,
    loading,
    markAttendance,
    bulkMarkAttendance
  } = useSupabaseData();

  if (loading) {
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
