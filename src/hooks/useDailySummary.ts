import { useMemo } from 'react';
import { format, addDays, parseISO, startOfDay } from 'date-fns';
import { Student, WeeklyTest, StudentAttendance, StudentFee, Timetable, Subject, Faculty } from '@/types';

interface UpcomingTest {
  name: string;
  subject: string;
  class: string | null;
  date: string;
}

export interface DailySummary {
  // Classes
  totalClassesToday: number;
  classesWithAttendance: number;
  attendanceProgress: number;
  
  // Attendance
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  
  // Fees
  collectedToday: number;
  feesDueSoon: number;
  overdueCount: number;
  
  // Tests
  upcomingTests: UpcomingTest[];
}

interface UseDailySummaryParams {
  students: Student[];
  weeklyTests: WeeklyTest[];
  attendance: StudentAttendance[];
  fees: StudentFee[];
  timetable: Timetable[];
  subjects: Subject[];
  faculty: Faculty[];
  todayPayments: number;
}

export function useDailySummary({
  students,
  weeklyTests,
  attendance,
  fees,
  timetable,
  subjects,
  faculty,
  todayPayments,
}: UseDailySummaryParams): DailySummary {
  return useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const dayOfWeek = today.getDay();
    const sevenDaysFromNow = addDays(today, 7);
    
    // === TODAY'S CLASSES ===
    // Filter timetable for today's day of week + special classes for today
    const todayClasses = timetable.filter(entry => {
      if (entry.type === 'special') {
        return entry.specificDate === todayStr;
      }
      // Regular class - check day of week and date range
      if (entry.dayOfWeek === dayOfWeek) {
        const startDate = entry.startDate ? parseISO(entry.startDate) : null;
        const endDate = entry.endDate ? parseISO(entry.endDate) : null;
        const todayDate = startOfDay(today);
        
        if (startDate && todayDate < startOfDay(startDate)) return false;
        if (endDate && todayDate > startOfDay(endDate)) return false;
        return true;
      }
      return false;
    });
    
    const totalClassesToday = todayClasses.length;
    
    // === ATTENDANCE STATUS ===
    const todayAttendance = attendance.filter(a => a.date === todayStr);
    
    // Unique students present/absent today (across all classes)
    const presentStudentIds = new Set(
      todayAttendance.filter(a => a.status === 'present').map(a => a.studentId)
    );
    const absentStudentIds = new Set(
      todayAttendance.filter(a => a.status === 'absent').map(a => a.studentId)
    );
    
    const presentCount = presentStudentIds.size;
    const absentCount = absentStudentIds.size;
    const totalMarked = presentCount + absentCount;
    const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;
    
    // Classes with attendance marked (unique subject-faculty combinations)
    const classesWithAttendanceSet = new Set(
      todayAttendance.map(a => `${a.subjectId}-${a.facultyId}`)
    );
    
    // Match against today's scheduled classes
    const classesWithAttendance = todayClasses.filter(tc => 
      classesWithAttendanceSet.has(`${tc.subjectId}-${tc.facultyId}`)
    ).length;
    
    const attendanceProgress = totalClassesToday > 0 
      ? Math.round((classesWithAttendance / totalClassesToday) * 100) 
      : 0;
    
    // === FEES ===
    // Fees due in next 7 days (not paid)
    const feesDueSoon = fees.filter(f => {
      if (f.status === 'paid') return false;
      const dueDate = parseISO(f.dueDate);
      return dueDate >= startOfDay(today) && dueDate <= sevenDaysFromNow;
    }).length;
    
    // Overdue fees count
    const overdueCount = fees.filter(f => f.status === 'overdue').length;
    
    // === UPCOMING TESTS ===
    const upcomingTests: UpcomingTest[] = weeklyTests
      .filter(t => {
        const testDate = parseISO(t.date);
        return testDate >= startOfDay(today) && testDate <= sevenDaysFromNow;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 3)
      .map(t => ({
        name: t.name,
        subject: t.subject,
        class: t.class,
        date: t.date,
      }));
    
    return {
      totalClassesToday,
      classesWithAttendance,
      attendanceProgress,
      presentCount,
      absentCount,
      attendanceRate,
      collectedToday: todayPayments,
      feesDueSoon,
      overdueCount,
      upcomingTests,
    };
  }, [students, weeklyTests, attendance, fees, timetable, subjects, faculty, todayPayments]);
}
