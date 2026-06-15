import { StudentAttendance } from '@/types';

export type AttendanceStatus = StudentAttendance['status'];

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return value === 'present' || value === 'absent' || value === 'late' || value === 'excused';
}

export const DEFAULT_DAILY_ATTENDANCE_PRIORITY: Record<AttendanceStatus, number> = {
  absent: 1,
  excused: 2,
  late: 3,
  present: 4,
};

export const ALERT_DAILY_ATTENDANCE_PRIORITY: Record<AttendanceStatus, number> = {
  excused: 1,
  absent: 2,
  late: 3,
  present: 4,
};

export function isAttendingStatus(status: AttendanceStatus): boolean {
  return status === 'present' || status === 'late';
}

export function pickPreferredAttendanceStatus(
  current: AttendanceStatus | undefined,
  next: AttendanceStatus,
  priority: Record<AttendanceStatus, number> = DEFAULT_DAILY_ATTENDANCE_PRIORITY,
): AttendanceStatus {
  if (!current) return next;
  return priority[next] >= priority[current] ? next : current;
}

export function buildDailyAttendanceStatusMap<T extends { date: string; status: string }>(
  records: T[],
  priority: Record<AttendanceStatus, number> = DEFAULT_DAILY_ATTENDANCE_PRIORITY,
): Map<string, AttendanceStatus> {
  const byDate = new Map<string, AttendanceStatus>();

  for (const record of records) {
    if (!isAttendanceStatus(record.status)) continue;
    byDate.set(
      record.date,
      pickPreferredAttendanceStatus(byDate.get(record.date), record.status, priority),
    );
  }

  return byDate;
}

export function getAttendanceSummary<T extends { date: string; status: string }>(
  records: T[],
  priority: Record<AttendanceStatus, number> = DEFAULT_DAILY_ATTENDANCE_PRIORITY,
) {
  const byDate = buildDailyAttendanceStatusMap(records, priority);
  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;

  byDate.forEach((status) => {
    if (status === 'present') present += 1;
    else if (status === 'absent') absent += 1;
    else if (status === 'late') late += 1;
    else if (status === 'excused') excused += 1;
  });

  const totalDays = byDate.size;
  const attendedDays = present + late;
  const attendanceRate = totalDays > 0 ? (attendedDays / totalDays) * 100 : 0;

  return {
    byDate,
    totalDays,
    present,
    absent,
    late,
    excused,
    attendedDays,
    attendanceRate,
  };
}

export function getAttendanceStreakStats<T extends { date: string; status: string }>(
  records: T[],
  priority: Record<AttendanceStatus, number> = DEFAULT_DAILY_ATTENDANCE_PRIORITY,
) {
  const byDate = buildDailyAttendanceStatusMap(records, priority);
  const attendedDates = Array.from(byDate.entries())
    .filter(([, status]) => isAttendingStatus(status))
    .map(([date]) => date)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (attendedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 1;
  let running = 1;

  for (let i = 1; i < attendedDates.length; i += 1) {
    const date = new Date(attendedDates[i]);
    const prevDate = new Date(attendedDates[i - 1]);
    const diff = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 1) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 1;
    }
  }

  const sortedDesc = [...attendedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  if (sortedDesc.length > 0) {
    const mostRecent = new Date(sortedDesc[0]);
    mostRecent.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 1) {
      currentStreak = 1;
      for (let i = 1; i < sortedDesc.length; i += 1) {
        const date = new Date(sortedDesc[i]);
        date.setHours(0, 0, 0, 0);

        const prevDate = new Date(sortedDesc[i - 1]);
        prevDate.setHours(0, 0, 0, 0);

        const diff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    }
  }

  return { currentStreak, longestStreak };
}