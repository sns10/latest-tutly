import React, { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { Student, StudentAttendance, Timetable, Subject, Faculty, ClassName, Division } from '@/types';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AttendanceStats } from './attendance/AttendanceStats';
import { VirtualizedStudentList } from './attendance/VirtualizedStudentList';
import { ReportExporter } from './ReportExporter';
import { WhatsAppMessageDialog } from './attendance/WhatsAppMessageDialog';
import { Clock, BookOpen, UserCircle, Search, AlertCircle, RefreshCw, CalendarDays, Users, ChevronDown, ChevronUp, MessageCircle, Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTuitionFeatures } from '@/hooks/useTuitionFeatures';
import { formatLocalDate } from '@/lib/dateWindows';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: StudentAttendance[];
  timetable?: Timetable[];
  subjects?: Subject[];
  faculty?: Faculty[];
  divisions?: Division[];
  onMarkAttendance: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string, subjectId?: string, facultyId?: string) => void;
  onBulkMarkAttendance?: (records: Array<{
    studentId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
    subjectId?: string;
    facultyId?: string;
  }>) => void;
  isBulkMarking?: boolean;
}

const CLASSES: ClassName[] = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

interface DetectedClass {
  class: ClassName;
  subject: Subject;
  faculty: Faculty;
  startTime: string;
  endTime: string;
}

export function AttendanceTracker({ 
  students, 
  attendance, 
  timetable = [], 
  subjects = [], 
  faculty = [], 
  divisions = [],
  onMarkAttendance,
  onBulkMarkAttendance,
  isBulkMarking = false,
}: AttendanceTrackerProps) {
  const { isFeatureEnabled } = useTuitionFeatures();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [detectedClass, setDetectedClass] = useState<DetectedClass | null>(null);
  
  // Collapsible state for mobile - default collapsed
  const [todaysClassesOpen, setTodaysClassesOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);

  const formatDate = formatLocalDate;
  const selectedDateStr = formatDate(selectedDate);

  // When navigating away from today, stop using the auto-detected subject/faculty context.
  // This prevents past attendance (often saved without subject/faculty) from appearing "missing".
  useEffect(() => {
    const today = formatDate(new Date());
    if (selectedDateStr !== today && !isManualMode) {
      setIsManualMode(true);
      setDetectedClass(null);
      setSelectedSubject('');
      setSelectedFaculty('');
    }
  }, [selectedDateStr, isManualMode]);

  // Smart Check: Detect ongoing class from timetable (regular + special)
  // Only run on initial mount, not when date changes
  useEffect(() => {
    if (isManualMode) return;

    // Only auto-detect for today's date
    const today = formatDate(new Date());
    if (selectedDateStr !== today) {
      // For previous dates, don't auto-detect - let user select manually
      return;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // First check for special classes on today's date
    const specialClassEntry = timetable.find(entry => {
      if (entry.type !== 'special' || entry.specificDate !== today) return false;
      return currentTime >= entry.startTime && currentTime <= entry.endTime;
    });

    // If no special class, check regular timetable
    const ongoingEntry = specialClassEntry || timetable.find(entry => {
      if (entry.type !== 'regular' || entry.dayOfWeek !== currentDay) return false;
      
      // Check if there's a special class override for today
      const hasOverride = timetable.some(
        t => t.type === 'special' && 
        t.specificDate === today && 
        t.class === entry.class &&
        t.startTime < entry.endTime && 
        t.endTime > entry.startTime
      );
      if (hasOverride) return false;
      
      return currentTime >= entry.startTime && currentTime <= entry.endTime;
    });

    if (ongoingEntry) {
      const matchedSubject = subjects.find(s => s.id === ongoingEntry.subjectId);
      const matchedFaculty = faculty.find(f => f.id === ongoingEntry.facultyId);

      if (matchedSubject && matchedFaculty) {
        setDetectedClass({
          class: ongoingEntry.class,
          subject: matchedSubject,
          faculty: matchedFaculty,
          startTime: ongoingEntry.startTime,
          endTime: ongoingEntry.endTime,
        });
        setSelectedClass(ongoingEntry.class);
        setSelectedSubject(ongoingEntry.subjectId);
        setSelectedFaculty(ongoingEntry.facultyId);
        return;
      }
    }

    // No ongoing class detected
    setDetectedClass(null);
    setIsManualMode(true);
  }, [timetable, subjects, faculty, isManualMode, selectedDateStr]);

  // Get available divisions for selected class
  const availableDivisions = useMemo(() => {
    if (!selectedClass) return [];
    return divisions.filter(d => d.class === selectedClass);
  }, [divisions, selectedClass]);

  // Exact current-session lookup: student + date + selected subject/faculty.
  // This is the source of truth for stats, filters and bulk-save decisions.
  const getExactAttendanceForStudent = useCallback((studentId: string) => {
    const selectedSubjectId = selectedSubject || null;
    const selectedFacultyId = selectedFaculty || null;

    // A dimension the user left as "All" is treated as "any", not "must be
    // null" — otherwise a row saved for this subject with a faculty attached
    // looks unmarked and bulk actions write a duplicate session row.
    const candidates = attendance.filter(a => {
      if (a.studentId !== studentId || a.date !== selectedDateStr) return false;
      const aSubject = a.subjectId ?? null;
      const aFaculty = a.facultyId ?? null;
      if (selectedSubjectId && aSubject !== selectedSubjectId) return false;
      if (selectedFacultyId && aFaculty !== selectedFacultyId) return false;
      if (!selectedSubjectId && !selectedFacultyId) {
        return aSubject === null && aFaculty === null;
      }
      return true;
    });

    if (candidates.length <= 1) return candidates[0];

    // Prefer the row that matches the unselected dimension as null (the exact
    // session the UI would write), then fall back to the first relaxed match.
    return (
      candidates.find(a =>
        (selectedSubjectId ? true : (a.subjectId ?? null) === null) &&
        (selectedFacultyId ? true : (a.facultyId ?? null) === null),
      ) ?? candidates[0]
    );
  }, [attendance, selectedDateStr, selectedSubject, selectedFaculty]);

  // Session ids to persist for a student: reuse the matched row's ids for any
  // dimension the user left as "All", so an update lands on the existing row.
  const getSaveContextForStudent = useCallback((studentId: string) => {
    const existing = getExactAttendanceForStudent(studentId);
    return {
      subjectId: selectedSubject || existing?.subjectId || undefined,
      facultyId: selectedFaculty || existing?.facultyId || undefined,
    };
  }, [getExactAttendanceForStudent, selectedSubject, selectedFaculty]);

  // Display lookup: exact session first, then fallback to general same-day
  // attendance only for row rendering. Bulk actions must not use this fallback,
  // otherwise a general present row can make the selected subject/faculty
  // session look complete while exact rows are still missing.
  const getAttendanceForStudent = useCallback((studentId: string) => {
    const selectedSubjectId = selectedSubject || null;
    const selectedFacultyId = selectedFaculty || null;
    const exact = getExactAttendanceForStudent(studentId);
    if (exact) return exact;

    // Fallback: when a subject/faculty filter is active but there is no record
    // for that exact context, surface a same-day record saved without any
    // subject/faculty (a "general" Mark All Present). This stops the row from
    // looking unmarked just because the user changed the subject filter after
    // saving — which on slow / mobile networks happens constantly and was the
    // main source of the "save disappeared" glitch.
    if (selectedSubjectId || selectedFacultyId) {
      return attendance.find(a =>
        a.studentId === studentId &&
        a.date === selectedDateStr &&
        (a.subjectId ?? null) === null &&
        (a.facultyId ?? null) === null,
      );
    }
    return undefined;
  }, [attendance, selectedDateStr, selectedSubject, selectedFaculty, getExactAttendanceForStudent]);

  // True when the row's displayed status came from the general fallback above
  // rather than the selected session. The list renders these as a dashed hint
  // so an unmarked session can never look confirmed.
  const isFallbackStatus = useCallback((studentId: string) => {
    if (!selectedSubject && !selectedFaculty) return false;
    if (getExactAttendanceForStudent(studentId)) return false;
    return !!getAttendanceForStudent(studentId);
  }, [selectedSubject, selectedFaculty, getExactAttendanceForStudent, getAttendanceForStudent]);

  // Students in the selected attendance target scope. Bulk actions operate on
  // this full class/division set, regardless of search/status filters.
  const targetStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter(s => s.class === selectedClass)
      .filter(s => !selectedDivision || s.divisionId === selectedDivision);
  }, [students, selectedClass, selectedDivision]);

  // Filter students by class, division and search query for list display.
  const filteredStudentsBase = useMemo(() => {
    return targetStudents.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [targetStudents, searchQuery]);

  // Apply status filter
  const filteredStudents = useMemo(() => {
    if (statusFilter === 'all') return filteredStudentsBase;
    
    return filteredStudentsBase.filter(student => {
      const studentAttendance = getExactAttendanceForStudent(student.id);
      if (statusFilter === 'unmarked') return !studentAttendance;
      return studentAttendance?.status === statusFilter;
    });
  }, [filteredStudentsBase, statusFilter, getExactAttendanceForStudent]);

  // Get today's scheduled classes from timetable
  const todaysClasses = useMemo(() => {
    const now = new Date();
    const today = formatDate(now);
    const currentDay = now.getDay();

    // Get special classes for today
    const specialClasses = timetable.filter(
      entry => entry.type === 'special' && entry.specificDate === today
    );

    // Get regular classes for today's day of week (not overridden by special)
    const regularClasses = timetable.filter(entry => {
      if (entry.type !== 'regular' || entry.dayOfWeek !== currentDay) return false;
      
      // Check if overridden by special class
      const isOverridden = specialClasses.some(
        s => s.class === entry.class &&
        s.startTime < entry.endTime && 
        s.endTime > entry.startTime
      );
      return !isOverridden;
    });

    return [...specialClasses, ...regularClasses]
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(entry => ({
        ...entry,
        subject: subjects.find(s => s.id === entry.subjectId),
        faculty: faculty.find(f => f.id === entry.facultyId),
      }));
  }, [timetable, subjects, faculty]);

  // Get available subjects for selected class
  const availableSubjects = useMemo(() => {
    if (!selectedClass) return [];
    return subjects.filter(s => s.class === selectedClass);
  }, [subjects, selectedClass]);

  // Get available faculty for selected subject
  const availableFaculty = useMemo(() => {
    if (!selectedSubject) return faculty;
    return faculty.filter(f => f.subjects?.some(s => s.id === selectedSubject));
  }, [faculty, selectedSubject]);

  // Never keep a faculty selected who does not teach the selected subject —
  // it would save attendance against a session that does not exist.
  useEffect(() => {
    if (!selectedSubject || !selectedFaculty) return;
    if (!availableFaculty.some(f => f.id === selectedFaculty)) {
      setSelectedFaculty('');
    }
  }, [selectedSubject, selectedFaculty, availableFaculty]);

  // Calculate attendance statistics from exact current-session rows. Display
  // fallback rows must not make the selected session look fully saved.
  const stats = useMemo(() => {
    const totalStudents = targetStudents.length;
    let present = 0, absent = 0, late = 0, excused = 0;

    targetStudents.forEach(student => {
      const status = getExactAttendanceForStudent(student.id)?.status;
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'excused') excused++;
    });

    return {
      totalStudents,
      present,
      absent,
      late,
      excused,
    };
  }, [targetStudents, getExactAttendanceForStudent]);

  // Get absentees for WhatsApp message
  const absentees = useMemo(() => {
    return targetStudents.filter(student => {
      const studentAttendance = getExactAttendanceForStudent(student.id);
      return studentAttendance?.status === 'absent';
    });
  }, [targetStudents, getExactAttendanceForStudent]);

  // Count students that need an exact current-session present row. A general
  // fallback present row must still be written into the selected session.
  const markAllPresentCount = useMemo(() => {
    return targetStudents.reduce(
      (n, s) => (getExactAttendanceForStudent(s.id)?.status === 'present' ? n : n + 1),
      0,
    );
  }, [targetStudents, getExactAttendanceForStudent]);

  // Get late students for WhatsApp message
  const lateStudents = useMemo(() => {
    return targetStudents.filter(student => {
      const studentAttendance = getExactAttendanceForStudent(student.id);
      return studentAttendance?.status === 'late';
    });
  }, [targetStudents, getExactAttendanceForStudent]);

  // Detect previous attendance sessions for the same class/date but different subject/faculty
  const previousAttendanceSessions = useMemo(() => {
    if (!selectedClass || !selectedDateStr) return [];
    
    const classStudentIds = targetStudents.map(s => s.id);
    
    if (classStudentIds.length === 0) return [];
    
    // Find distinct attendance sessions for this date, excluding current subject/faculty selection
    const sessionsMap = new Map<string, {
      subjectId: string | null;
      facultyId: string | null;
      subjectName: string;
      facultyName: string;
      markedCount: number;
    }>();
    const countedSessionStudents = new Set<string>();
    
    attendance.forEach(a => {
      if (a.date !== selectedDateStr) return;
      if (!classStudentIds.includes(a.studentId)) return;
      
      // Skip current selection (only if both subject AND faculty match current)
      const isSameSession = (a.subjectId ?? null) === (selectedSubject || null) && 
                            (a.facultyId ?? null) === (selectedFaculty || null);
      if (isSameSession) return;
      
      // Create unique key for this session (subject + faculty combination)
      const key = `${a.subjectId ?? 'null'}-${a.facultyId ?? 'null'}`;
      
      if (!sessionsMap.has(key)) {
        const subjectName = a.subjectId 
          ? subjects.find(s => s.id === a.subjectId)?.name || 'Unknown Subject'
          : 'General';
        const facultyName = a.facultyId
          ? faculty.find(f => f.id === a.facultyId)?.name || 'Unknown Faculty'
          : 'General';
        
        sessionsMap.set(key, {
          subjectId: a.subjectId || null,
          facultyId: a.facultyId || null,
          subjectName,
          facultyName,
          markedCount: 0,
        });
      }
      
      const session = sessionsMap.get(key)!;
      const studentSessionKey = `${key}-${a.studentId}`;
      if (!countedSessionStudents.has(studentSessionKey)) {
        countedSessionStudents.add(studentSessionKey);
        session.markedCount++;
      }
    });
    
    return Array.from(sessionsMap.values());
  }, [attendance, targetStudents, selectedClass, selectedDateStr, selectedSubject, selectedFaculty, subjects, faculty]);

  const handleMarkAttendance = useCallback((studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Student';
    const ctx = getSaveContextForStudent(studentId);
    onMarkAttendance(studentId, selectedDateStr, status, undefined, ctx.subjectId, ctx.facultyId);
    
    const subjectName = selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : '';
    const context = subjectName ? ` for ${subjectName}` : '';
    
    // Defer toast to next frame so it doesn't mount in the same tick as the
    // optimistic re-render — on mobile this can otherwise eat the next tap.
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => toast.success(`${studentName}${context} marked as ${status}`));
    } else {
      toast.success(`${studentName}${context} marked as ${status}`);
    }
  }, [students, onMarkAttendance, selectedDateStr, selectedSubject, subjects, getSaveContextForStudent]);

  const handleBulkAttendance = useCallback((status: 'present' | 'absent' | 'late' | 'excused') => {
    // Every bulk action uses the same rule: the full class/division roster, and
    // any student whose exact-session status differs from the target status is
    // written. Display fallback rows are intentionally ignored here.
    const studentsToMark = targetStudents.filter(student => {
      const existingAttendance = getExactAttendanceForStudent(student.id);
      return existingAttendance?.status !== status;
    });
    
    if (studentsToMark.length === 0) {
      toast.info(`All students are already marked ${status}`);
      return;
    }

    // Use bulk handler if available for single API call
    if (onBulkMarkAttendance) {
      const records = studentsToMark.map(student => ({
        studentId: student.id,
        date: selectedDateStr,
        status,
        ...getSaveContextForStudent(student.id),
      }));
      toast.info(`Saving ${records.length} student${records.length === 1 ? '' : 's'} as ${status}…`);
      onBulkMarkAttendance(records);
    } else {
      // Fallback to individual calls
      studentsToMark.forEach(student => {
        const ctx = getSaveContextForStudent(student.id);
        onMarkAttendance(student.id, selectedDateStr, status, undefined, ctx.subjectId, ctx.facultyId);
      });
      toast.success(`${studentsToMark.length} students marked as ${status}`);
    }
  }, [targetStudents, getExactAttendanceForStudent, getSaveContextForStudent, onMarkAttendance, onBulkMarkAttendance, selectedDateStr]);

  // Copy attendance from a previous class session
  const handleCopyFromPreviousClass = useCallback((sourceSubjectId: string | null, sourceFacultyId: string | null) => {
    // Same roster scope as the bulk actions — search/status filters must not
    // silently shrink what gets copied.
    const studentsToCopy = targetStudents.filter(student => {
      // Skip if already has attendance in current session
      const existingAttendance = getExactAttendanceForStudent(student.id);
      if (existingAttendance) return false;
      
      // Check if student has attendance in source session
      const sourceAttendance = attendance.find(a => 
        a.studentId === student.id && 
        a.date === selectedDateStr &&
        (a.subjectId ?? null) === sourceSubjectId &&
        (a.facultyId ?? null) === sourceFacultyId
      );
      return !!sourceAttendance;
    });
    
    if (studentsToCopy.length === 0) {
      toast.info('No students to copy - all already have attendance marked');
      return;
    }

    // Build records with copied statuses
    const records = studentsToCopy.map(student => {
      const sourceAttendance = attendance.find(a => 
        a.studentId === student.id && 
        a.date === selectedDateStr &&
        (a.subjectId ?? null) === sourceSubjectId &&
        (a.facultyId ?? null) === sourceFacultyId
      )!;
      
      return {
        studentId: student.id,
        date: selectedDateStr,
        status: sourceAttendance.status as 'present' | 'absent' | 'late' | 'excused',
        notes: sourceAttendance.notes,
        subjectId: selectedSubject || undefined,
        facultyId: selectedFaculty || undefined,
      };
    });

    if (!onBulkMarkAttendance) {
      toast.error('Bulk copy is unavailable right now');
      return;
    }
    onBulkMarkAttendance(records);
  }, [targetStudents, getExactAttendanceForStudent, attendance, selectedDateStr, selectedSubject, selectedFaculty, onBulkMarkAttendance]);

  const handleSwitchToManual = () => {
    setIsManualMode(true);
    setDetectedClass(null);
    setSelectedClass('');
    setSelectedDivision('');
    setSelectedSubject('');
    setSelectedFaculty('');
  };

  const handleRefreshDetection = () => {
    setIsManualMode(false);
    setDetectedClass(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Auto-Detected Class Banner */}
      {detectedClass && !isManualMode && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">
                  Ongoing Class Detected: {detectedClass.class} {detectedClass.subject.name}
                </p>
                <p className="text-sm text-green-600">
                  {detectedClass.startTime} - {detectedClass.endTime} • {detectedClass.faculty.name}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSwitchToManual}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              Change
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Header with Date Navigation */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-foreground">Attendance</h1>
              <p className="text-muted-foreground text-xs">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div className="flex gap-2">
              {isManualMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshDetection}
                  className="gap-1 h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Auto
                </Button>
              )}
              <ReportExporter
                type="absentees"
                label="PDF"
                classValue={selectedClass || undefined}
                startDate={selectedDateStr}
              />
            </div>
          </div>

          {/* Date Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                setSelectedDate(prev);
              }}
              className="h-8 text-xs flex-1"
            >
              ← Previous
            </Button>
            <Button
              variant={formatDate(selectedDate) === formatDate(new Date()) ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="h-8 text-xs flex-1"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                setSelectedDate(next);
              }}
              className="h-8 text-xs flex-1"
              disabled={formatDate(selectedDate) >= formatDate(new Date())}
            >
              Next →
            </Button>
          </div>
        </div>

        {/* Prepare WhatsApp Message - Show when class selected, attendance marked, and feature enabled */}
        {isFeatureEnabled('whatsapp_alerts') && selectedClass && (stats.present + stats.absent + stats.late) > 0 && (
          <Button
            onClick={() => setWhatsappDialogOpen(true)}
            className="w-full h-10 gap-2 bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            {stats.absent > 0
              ? `Prepare Group Message (${stats.absent} absent)`
              : 'Share Attendance Report ✅'}
          </Button>
        )}

        {/* Attendance Summary - Inline when class selected */}
        {selectedClass && (
          <Card className="bg-white shadow-sm border-slate-200">
            <CardContent className="p-3">
              <AttendanceStats stats={stats} />
            </CardContent>
          </Card>
        )}

        {/* Compact Filters Row */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-3 space-y-3">
            {/* Row 1: Class + Division */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedClass} onValueChange={(value) => {
                setSelectedClass(value);
                setSelectedDivision('');
                setSelectedSubject('');
                setSelectedFaculty('');
                setStatusFilter('all');
              }}>
                <SelectTrigger className="bg-white h-9 text-sm">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {CLASSES.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls} Grade</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {availableDivisions.length > 0 ? (
                <Select 
                  value={selectedDivision || "all"} 
                  onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}
                  disabled={!selectedClass}
                >
                  <SelectTrigger className="bg-white h-9 text-sm">
                    <SelectValue placeholder="All divisions" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All divisions</SelectItem>
                    {availableDivisions.map(div => (
                      <SelectItem key={div.id} value={div.id}>
                        Div {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div />
              )}
            </div>

            {/* Row 2: Subject + Faculty */}
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={selectedSubject || "all"} 
                onValueChange={(v) => setSelectedSubject(v === "all" ? "" : v)}
                disabled={!selectedClass}
              >
                <SelectTrigger className="bg-white h-9 text-sm">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All subjects</SelectItem>
                  {availableSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedFaculty || "all"} 
                onValueChange={(v) => setSelectedFaculty(v === "all" ? "" : v)}
                disabled={!selectedClass}
              >
                <SelectTrigger className="bg-white h-9 text-sm">
                  <SelectValue placeholder="All faculty" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All faculty</SelectItem>
                  {availableFaculty.map(fac => (
                    <SelectItem key={fac.id} value={fac.id}>
                      {fac.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Status Filter */}
            <div className="flex gap-1 flex-wrap">
              {[
                { value: 'all', label: 'All', count: targetStudents.length },
                { value: 'present', label: 'Present', count: stats.present, color: 'bg-green-100 text-green-700' },
                { value: 'absent', label: 'Absent', count: stats.absent, color: 'bg-red-100 text-red-700' },
                { value: 'late', label: 'Late', count: stats.late, color: 'bg-yellow-100 text-yellow-700' },
                { value: 'unmarked', label: 'Unmarked', count: targetStudents.length - (stats.present + stats.absent + stats.late + stats.excused) },
              ].map(({ value, label, count, color }) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(value)}
                  className={`h-7 text-xs px-2 gap-1 ${statusFilter === value ? '' : color || ''}`}
                >
                  {label}
                  <span className="text-[10px] opacity-75">({count})</span>
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white h-10"
              />
            </div>

            {/* Mark All Present Button */}
            <Button 
              onClick={() => handleBulkAttendance('present')} 
              className="w-full bg-green-600 hover:bg-green-700 h-9 text-sm font-medium" 
              disabled={!selectedClass || markAllPresentCount === 0 || isBulkMarking}
            >
              {isBulkMarking
                ? 'Saving…'
                : markAllPresentCount === 0
                  ? 'All Present'
                  : `Mark All Present (${markAllPresentCount})`}
            </Button>

            {/* Copy from Previous Class - Show when previous sessions exist */}
            {previousAttendanceSessions.length > 0 && selectedClass && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                </div>

                {previousAttendanceSessions.length === 1 ? (
                  <Button
                    variant="outline"
                    onClick={() => handleCopyFromPreviousClass(
                      previousAttendanceSessions[0].subjectId,
                      previousAttendanceSessions[0].facultyId
                    )}
                    className="w-full gap-2 h-9 text-sm"
                  >
                    <Copy className="h-4 w-4" />
                    Copy from {previousAttendanceSessions[0].subjectName} ({previousAttendanceSessions[0].markedCount} students)
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full gap-2 h-9 text-sm">
                        <Copy className="h-4 w-4" />
                        Copy from Previous Class
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-64 bg-white">
                      {previousAttendanceSessions.map((session, idx) => (
                        <DropdownMenuItem 
                          key={`${session.subjectId}-${session.facultyId}-${idx}`}
                          onClick={() => handleCopyFromPreviousClass(session.subjectId, session.facultyId)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{session.subjectName}</span>
                            <span className="text-xs text-muted-foreground">
                              {session.facultyName} • {session.markedCount} students
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Student List - Primary Content */}
        {!selectedClass ? (
          <Card className="bg-white shadow-sm border-slate-200">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-medium text-foreground mb-1">Select a Class</h3>
              <p className="text-muted-foreground text-sm">
                Choose a class to view students
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white shadow-sm border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">
                  Students ({filteredStudents.length})
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedDate.toLocaleDateString()}
                </span>
              </div>
              <VirtualizedStudentList
                students={filteredStudents}
                getAttendanceForStudent={getAttendanceForStudent}
                isFallbackStatus={isFallbackStatus}
                onMarkAttendance={handleMarkAttendance}
              />
            </CardContent>
          </Card>
        )}

        {/* Collapsible Secondary Sections */}
        <div className="space-y-2">
          {/* Date Picker - Collapsible */}
          <Collapsible open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <Card className="bg-white shadow-sm border-slate-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Change Date</span>
                  </div>
                  {datePickerOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 border-t border-slate-100">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border border-slate-200 pointer-events-auto mx-auto"
                  />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Today's Classes - Collapsible */}
          {todaysClasses.length > 0 && (
            <Collapsible open={todaysClassesOpen} onOpenChange={setTodaysClassesOpen}>
              <Card className="bg-white shadow-sm border-slate-200 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Today's Classes</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {todaysClasses.length}
                      </span>
                    </div>
                    {todaysClassesOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto">
                    {todaysClasses.map((entry, idx) => (
                      <button
                        key={`${entry.id}-${idx}`}
                        onClick={() => {
                          setSelectedClass(entry.class);
                          setSelectedSubject(entry.subjectId);
                          setSelectedFaculty(entry.facultyId);
                          setIsManualMode(true);
                          setTodaysClassesOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-slate-50 border border-slate-100 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-blue-600 font-medium">
                            {entry.startTime} - {entry.endTime}
                          </span>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                            {entry.class}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{entry.subject?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{entry.faculty?.name}</p>
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      </div>

      {/* WhatsApp Message Dialog */}
      <WhatsAppMessageDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        absentees={absentees}
        lateStudents={lateStudents}
        selectedClass={selectedClass}
        selectedDivision={divisions.find(d => d.id === selectedDivision)?.name}
        selectedDate={selectedDate}
        subject={subjects.find(s => s.id === selectedSubject)}
        faculty={faculty.find(f => f.id === selectedFaculty)}
      />
    </div>
  );
}
