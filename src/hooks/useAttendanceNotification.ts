import { useEffect, useState, useRef } from 'react';
import { Timetable, StudentAttendance, Subject, Faculty } from '@/types';
import { format, parseISO, isSameDay, parse, differenceInMinutes, startOfDay } from 'date-fns';

interface PendingAttendanceClass {
  timetableId: string;
  className: string;
  subjectName: string;
  facultyName: string;
  endTime: string;
  subjectId: string;
  facultyId: string;
  date: string;
}

export function useAttendanceNotification(
  timetable: Timetable[],
  attendance: StudentAttendance[],
  subjects: Subject[],
  faculty: Faculty[]
) {
  const [pendingClass, setPendingClass] = useState<PendingAttendanceClass | null>(null);
  const [notifiedClasses, setNotifiedClasses] = useState<Set<string>>(new Set());
  const notifiedClassesRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref with state whenever state changes
  useEffect(() => {
    notifiedClassesRef.current = notifiedClasses;
  }, [notifiedClasses]);

  useEffect(() => {
    // Don't run if no timetable entries
    if (!timetable || timetable.length === 0) return;

    const checkForPendingAttendance = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const todayStr = format(now, 'yyyy-MM-dd');

      // Find classes that are currently ongoing and ending in 10 minutes
      const ongoingClasses = timetable.filter(entry => {
        // Check if this is a regular class for today
        if (entry.type === 'regular') {
          if (entry.dayOfWeek !== currentDay) return false;
        } else if (entry.type === 'special') {
          // Check if this special class is for today
          if (entry.specificDate === todayStr) {
            // Specific date matches today
          } else if (entry.startDate && entry.endDate) {
            // Check if it's within a date range
            const startDate = parseISO(entry.startDate);
            const endDate = parseISO(entry.endDate);
            const today = startOfDay(parse(todayStr, 'yyyy-MM-dd', new Date()));
            const start = startOfDay(startDate);
            const end = startOfDay(endDate);
            if (today < start || today > end) return false;
          } else {
            return false;
          }
        }

        // Parse start and end times into Date objects using today's date
        const [startHour, startMinute] = entry.startTime.split(':').map(Number);
        const [endHour, endMinute] = entry.endTime.split(':').map(Number);

        const startDateTime = new Date(now);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        const endDateTime = new Date(now);
        endDateTime.setHours(endHour, endMinute, 0, 0);

        // Check if class is currently ongoing using Date comparisons
        if (now < startDateTime || now >= endDateTime) {
          return false;
        }

        // Calculate time until class ends
        const minutesUntilEnd = differenceInMinutes(endDateTime, now);

        // Check if it's 10 minutes before end (widen window to 5-15 minutes for better reliability)
        if (minutesUntilEnd > 15 || minutesUntilEnd < 5) {
          return false;
        }

        return true;
      });

      // Check if attendance is marked for any of these classes
      for (const entry of ongoingClasses) {
        const entryId = `${entry.id}-${todayStr}`;

        // Skip if we've already notified for this class (using ref to avoid stale closure)
        if (notifiedClassesRef.current.has(entryId)) {
          continue;
        }

        // Check if attendance is marked for this class/subject/faculty/date
        const hasAttendance = attendance.some(att => {
          const attDate = format(parseISO(att.date), 'yyyy-MM-dd');
          return (
            attDate === todayStr &&
            att.subjectId === entry.subjectId &&
            att.facultyId === entry.facultyId
          );
        });

        if (!hasAttendance) {
          const subject = subjects.find(s => s.id === entry.subjectId);
          const facultyMember = faculty.find(f => f.id === entry.facultyId);

          setPendingClass({
            timetableId: entry.id,
            className: entry.class,
            subjectName: subject?.name || 'Unknown Subject',
            facultyName: facultyMember?.name || 'Unknown Faculty',
            endTime: entry.endTime,
            subjectId: entry.subjectId,
            facultyId: entry.facultyId,
            date: todayStr,
          });

          // Mark as notified using functional update to avoid needing current value
          setNotifiedClasses(prev => {
            const updated = new Set(prev).add(entryId);
            notifiedClassesRef.current = updated;
            return updated;
          });
          break; // Only show one notification at a time
        }
      }
    };

    // Check immediately
    checkForPendingAttendance();

    // Check every 30 seconds
    intervalRef.current = setInterval(checkForPendingAttendance, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timetable, attendance, subjects, faculty]);

  // Clear pending class when attendance is marked
  useEffect(() => {
    if (!pendingClass) return;

    const hasAttendance = attendance.some(att => {
      const attDate = format(parseISO(att.date), 'yyyy-MM-dd');
      return (
        attDate === pendingClass.date &&
        att.subjectId === pendingClass.subjectId &&
        att.facultyId === pendingClass.facultyId
      );
    });

    if (hasAttendance) {
      setPendingClass(null);
    }
  }, [attendance, pendingClass]);

  // Clear pending class if class has ended
  useEffect(() => {
    if (!pendingClass) return;

    const checkInterval = setInterval(() => {
      const now = new Date();

      // Parse endTime into a Date object for numeric comparison
      const [endHour, endMinute] = pendingClass.endTime.split(':').map(Number);
      const endDateTime = new Date(now);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      // Use numeric comparison
      if (now >= endDateTime) {
        setPendingClass(null);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [pendingClass]);

  const dismissNotification = () => {
    if (pendingClass) {
      const entryId = `${pendingClass.timetableId}-${pendingClass.date}`;
      setNotifiedClasses(prev => {
        const updated = new Set(prev).add(entryId);
        notifiedClassesRef.current = updated;
        return updated;
      });
      setPendingClass(null);
    }
  };

  return {
    pendingClass,
    dismissNotification,
  };
}

