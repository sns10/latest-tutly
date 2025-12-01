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
    loading,
    markAttendance
  } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <AttendanceTracker
        students={students}
        attendance={attendance}
        timetable={timetable}
        subjects={subjects}
        faculty={faculty}
        onMarkAttendance={markAttendance}
      />
    </div>
  );
}
