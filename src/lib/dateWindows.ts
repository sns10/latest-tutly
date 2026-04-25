/**
 * Shared time-window helpers for query scoping.
 *
 * Goal: keep dashboard reads bounded so a tuition with years of history
 * doesn't pull every row into the browser on every page load.
 *
 * The Indian academic year typically runs June -> May. We default to
 * "current academic year" for fees / tests / student data, and a rolling
 * 60-day window for general attendance. Callers can opt into wider
 * windows by passing { loadHistory: true } or explicit start/end dates.
 */

export function getCurrentAcademicYearStart(today: Date = new Date()): string {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed; 5 = June
  const startYear = month >= 5 ? year : year - 1;
  // June 1st of startYear
  return `${startYear}-06-01`;
}

export function getDefaultAttendanceWindowStart(days = 60, today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
