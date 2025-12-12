import { useMemo } from 'react';
import { StudentAttendance } from '@/types';

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
      // Sort by date descending (most recent first)
      const sorted = [...records].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Get unique dates with 'present' status
      const presentDates = new Set<string>();
      sorted.forEach(r => {
        if (r.status === 'present') {
          presentDates.add(r.date);
        }
      });

      // Convert to sorted array of dates
      const dates = Array.from(presentDates).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );

      if (dates.length === 0) {
        streakMap[studentId] = 0;
        return;
      }

      // Count consecutive days from today/most recent
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Start from the most recent attendance date
      let currentDate = new Date(dates[0]);
      currentDate.setHours(0, 0, 0, 0);
      
      // Only count streak if most recent attendance is today or yesterday
      const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 1) {
        // Streak broken - most recent attendance was more than 1 day ago
        streakMap[studentId] = 0;
        return;
      }

      // Count consecutive days
      for (let i = 0; i < dates.length; i++) {
        const date = new Date(dates[i]);
        date.setHours(0, 0, 0, 0);
        
        if (i === 0) {
          streak = 1;
        } else {
          const prevDate = new Date(dates[i - 1]);
          prevDate.setHours(0, 0, 0, 0);
          
          const diff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 1) {
            streak++;
          } else {
            // Streak broken
            break;
          }
        }
      }

      streakMap[studentId] = streak;
    });

    return streakMap;
  }, [attendance]);

  return studentStreaks;
}

// Get streak for a single student
export function getStudentStreak(attendance: StudentAttendance[], studentId: string): number {
  const studentRecords = attendance.filter(a => a.studentId === studentId);
  
  // Sort by date descending
  const sorted = [...studentRecords].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get unique dates with 'present' status
  const presentDates = new Set<string>();
  sorted.forEach(r => {
    if (r.status === 'present') {
      presentDates.add(r.date);
    }
  });

  const dates = Array.from(presentDates).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const mostRecent = new Date(dates[0]);
  mostRecent.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const date = new Date(dates[i]);
    date.setHours(0, 0, 0, 0);
    
    const prevDate = new Date(dates[i - 1]);
    prevDate.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
