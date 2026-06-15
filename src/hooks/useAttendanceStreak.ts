import { useMemo } from 'react';
import { StudentAttendance } from '@/types';
import { getAttendanceStreakStats } from '@/lib/attendance';

// Calculate consecutive days of attendance streak for each student
export function useAttendanceStreak(attendance: StudentAttendance[]) {
  const studentStreaks = useMemo(() => {
    const streakMap: Record<string, number> = {};
    
    // Group attendance by student
    const byStudent: Record<string, StudentAttendance[]> = {};
    attendance.forEach(a => {
      if (!byStudent[a.studentId]) {
        byStudent[a.studentId] = [];
      }
      byStudent[a.studentId].push(a);
    });

    // Calculate streak for each student
    Object.entries(byStudent).forEach(([studentId, records]) => {
      streakMap[studentId] = getAttendanceStreakStats(records).currentStreak;
    });

    return streakMap;
  }, [attendance]);

  return studentStreaks;
}

// Get streak for a single student
export function getStudentStreak(attendance: StudentAttendance[], studentId: string): number {
  const studentRecords = attendance.filter(a => a.studentId === studentId);
  return getAttendanceStreakStats(studentRecords).currentStreak;
}
