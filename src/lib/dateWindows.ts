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
  return d.toISOString().split('T')[0];
}
