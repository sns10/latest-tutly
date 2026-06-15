/**
 * Shared time-window helpers for query scoping.
 *
 * Attendance reads use a rolling window for performance. Fees / tests /
 * homework no longer auto-scope to an academic year — all history loads
 * by default (pagination handles large datasets).
 */

export function getDefaultAttendanceWindowStart(days = 60, today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
