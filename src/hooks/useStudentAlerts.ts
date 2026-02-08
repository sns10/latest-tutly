import { useMemo, useState, useCallback } from 'react';
import { Student, StudentAttendance, WeeklyTest, StudentTestResult } from '@/types';
import { format } from 'date-fns';

export interface StudentAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  type: 'consecutive_absence' | 'score_drop';
  severity: 'warning' | 'critical';
  message: string;
  detail: string;
  value: number;
}

interface UseStudentAlertsParams {
  students: Student[];
  attendance: StudentAttendance[];
  weeklyTests: WeeklyTest[];
  testResults: StudentTestResult[];
  isAttendanceEnabled: boolean;
}

const DISMISSED_KEY = 'student-alerts-dismissed';

function getDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function useStudentAlerts({
  students,
  attendance,
  weeklyTests,
  testResults,
  isAttendanceEnabled,
}: UseStudentAlertsParams) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedIds);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(alertId);
      saveDismissedIds(next);
      return next;
    });
  }, []);

  const absenceAlerts = useMemo<StudentAlert[]>(() => {
    if (!isAttendanceEnabled || attendance.length === 0) return [];

    // Group attendance by student
    const byStudent = new Map<string, StudentAttendance[]>();
    for (const record of attendance) {
      const list = byStudent.get(record.studentId) || [];
      list.push(record);
      byStudent.set(record.studentId, list);
    }

    const studentMap = new Map(students.map(s => [s.id, s]));
    const alerts: StudentAlert[] = [];

    for (const [studentId, records] of byStudent) {
      const student = studentMap.get(studentId);
      if (!student) continue;

      // Get unique dates sorted descending
      const dateStatusMap = new Map<string, string>();
      for (const r of records) {
        // If student was present in ANY session that day, count as present
        const existing = dateStatusMap.get(r.date);
        if (existing === 'present') continue;
        if (r.status === 'present' || r.status === 'late') {
          dateStatusMap.set(r.date, 'present');
        } else {
          dateStatusMap.set(r.date, r.status);
        }
      }

      const sortedDates = [...dateStatusMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]));

      let consecutiveAbsent = 0;
      let lastPresentDate = '';

      for (const [date, status] of sortedDates) {
        if (status === 'absent') {
          consecutiveAbsent++;
        } else {
          lastPresentDate = date;
          break;
        }
      }

      if (consecutiveAbsent >= 3) {
        const severity = consecutiveAbsent >= 5 ? 'critical' : 'warning';
        const lastPresentStr = lastPresentDate
          ? format(new Date(lastPresentDate), 'MMM d')
          : 'Unknown';

        alerts.push({
          id: `absence-${studentId}`,
          studentId,
          studentName: student.name,
          studentClass: student.class,
          type: 'consecutive_absence',
          severity,
          message: `Absent for ${consecutiveAbsent} consecutive days`,
          detail: `Last present: ${lastPresentStr}`,
          value: consecutiveAbsent,
        });
      }
    }

    return alerts;
  }, [students, attendance, isAttendanceEnabled]);

  const scoreDropAlerts = useMemo<StudentAlert[]>(() => {
    if (weeklyTests.length === 0 || testResults.length === 0) return [];

    const testMap = new Map(weeklyTests.map(t => [t.id, t]));
    const studentMap = new Map(students.map(s => [s.id, s]));

    // Group test results by student, enriched with test date/maxMarks
    const byStudent = new Map<string, Array<{ marks: number; maxMarks: number; date: string }>>();

    for (const result of testResults) {
      const test = testMap.get(result.testId);
      if (!test || test.maxMarks === 0) continue;

      const list = byStudent.get(result.studentId) || [];
      list.push({
        marks: result.marks,
        maxMarks: test.maxMarks,
        date: test.date,
      });
      byStudent.set(result.studentId, list);
    }

    const alerts: StudentAlert[] = [];

    for (const [studentId, results] of byStudent) {
      if (results.length < 4) continue; // Need at least 4 tests

      const student = studentMap.get(studentId);
      if (!student) continue;

      // Sort by date descending
      results.sort((a, b) => b.date.localeCompare(a.date));

      const recent = results.slice(0, 3);
      const previous = results.slice(3, 6);

      if (previous.length < 1) continue; // Need some previous data

      const recentAvg = recent.reduce((sum, r) => sum + (r.marks / r.maxMarks) * 100, 0) / recent.length;
      const previousAvg = previous.reduce((sum, r) => sum + (r.marks / r.maxMarks) * 100, 0) / previous.length;

      const drop = previousAvg - recentAvg;

      if (drop >= 20 && previousAvg > 0) {
        const severity = drop >= 30 ? 'critical' : 'warning';

        alerts.push({
          id: `score-drop-${studentId}`,
          studentId,
          studentName: student.name,
          studentClass: student.class,
          type: 'score_drop',
          severity,
          message: `Test scores dropped by ${Math.round(drop)}%`,
          detail: `Recent avg: ${Math.round(recentAvg)}% | Previous avg: ${Math.round(previousAvg)}%`,
          value: Math.round(drop),
        });
      }
    }

    return alerts;
  }, [students, weeklyTests, testResults]);

  const allAlerts = useMemo(() => {
    const combined = [...absenceAlerts, ...scoreDropAlerts];

    // Sort: critical first, then by value descending
    combined.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }
      return b.value - a.value;
    });

    return combined;
  }, [absenceAlerts, scoreDropAlerts]);

  const visibleAlerts = useMemo(
    () => allAlerts.filter(a => !dismissedIds.has(a.id)),
    [allAlerts, dismissedIds]
  );

  return {
    alerts: visibleAlerts,
    totalCount: allAlerts.length,
    dismissAlert,
  };
}
