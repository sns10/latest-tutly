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
  onBulkMarkAttendance
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

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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

  // Memoize attendance lookup for performance - prevents stale closures
  const getAttendanceForStudent = useCallback((studentId: string) => {
    return attendance.find(a => {
      if (a.studentId !== studentId || a.date !== selectedDateStr) return false;
      
      // Match subject: if selectedSubject is set, must match; if not set, don't filter by subject
      const subjectMatches = selectedSubject
        ? a.subjectId === selectedSubject
        : true;
      
      // Match faculty: if selectedFaculty is set, must match; if not set, don't filter by faculty
      const facultyMatches = selectedFaculty
        ? a.facultyId === selectedFaculty
        : true;
      
      return subjectMatches && facultyMatches;
    });
  }, [attendance, selectedDateStr, selectedSubject, selectedFaculty]);

  // Filter students by class, division and search query
  const filteredStudentsBase = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter(s => s.class === selectedClass)
      .filter(s => !selectedDivision || s.divisionId === selectedDivision)
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, selectedClass, selectedDivision, searchQuery]);

  // Apply status filter
  const filteredStudents = useMemo(() => {
    if (statusFilter === 'all') return filteredStudentsBase;
    
    return filteredStudentsBase.filter(student => {
      const studentAttendance = getAttendanceForStudent(student.id);
      if (statusFilter === 'unmarked') return !studentAttendance;
      return studentAttendance?.status === statusFilter;
    });
  }, [filteredStudentsBase, statusFilter, getAttendanceForStudent]);

  // Get today's scheduled classes from timetable
  const todaysClasses = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
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

  // Calculate attendance statistics - must match exact subject/faculty context (use base to count all)
  const stats = useMemo(() => {
    const totalStudents = filteredStudentsBase.length;
    const dateAttendance = attendance.filter(a => {
      if (a.date !== selectedDateStr) return false;
      if (!filteredStudentsBase.some(s => s.id === a.studentId)) return false;
      
      // Match exact subject/faculty context when selected; otherwise don't filter
      const subjectMatches = selectedSubject
        ? a.subjectId === selectedSubject
        : true;
      const facultyMatches = selectedFaculty
        ? a.facultyId === selectedFaculty
        : true;
      
      return subjectMatches && facultyMatches;
    });
    
    return {
      totalStudents,
      present: dateAttendance.filter(a => a.status === 'present').length,
      absent: dateAttendance.filter(a => a.status === 'absent').length,
      late: dateAttendance.filter(a => a.status === 'late').length,
      excused: dateAttendance.filter(a => a.status === 'excused').length,
    };
  }, [filteredStudentsBase, attendance, selectedDateStr, selectedSubject, selectedFaculty]);

  // Get absentees for WhatsApp message
  const absentees = useMemo(() => {
    return filteredStudentsBase.filter(student => {
      const studentAttendance = getAttendanceForStudent(student.id);
      return studentAttendance?.status === 'absent';
    });
  }, [filteredStudentsBase, getAttendanceForStudent]);

  // Get late students for WhatsApp message
  const lateStudents = useMemo(() => {
    return filteredStudentsBase.filter(student => {
      const studentAttendance = getAttendanceForStudent(student.id);
      return studentAttendance?.status === 'late';
    });
  }, [filteredStudentsBase, getAttendanceForStudent]);

  // Detect previous attendance sessions for the same class/date but different subject/faculty
  const previousAttendanceSessions = useMemo(() => {
    if (!selectedClass || !selectedDateStr) return [];
    
    // Get student IDs in the selected class (and optionally division)
    const classStudentIds = students
      .filter(s => s.class === selectedClass)
      .filter(s => !selectedDivision || s.divisionId === selectedDivision)
      .map(s => s.id);
    
    if (classStudentIds.length === 0) return [];
    
    // Find distinct attendance sessions for this date, excluding current subject/faculty selection
    const sessionsMap = new Map<string, {
      subjectId: string | null;
      facultyId: string | null;
      subjectName: string;
      facultyName: string;
      markedCount: number;
    }>();
    
    attendance.forEach(a => {
      if (a.date !== selectedDateStr) return;
      if (!classStudentIds.includes(a.studentId)) return;
      
      // Skip current selection (only if both subject AND faculty match current)
      const isSameSession = a.subjectId === (selectedSubject || null) && 
                            a.facultyId === (selectedFaculty || null);
      if (isSameSession) return;
      
      // Create unique key for this session (subject + faculty combination)
      const key = `${a.subjectId || 'null'}-${a.facultyId || 'null'}`;
      
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
      session.markedCount++;
    });
    
    return Array.from(sessionsMap.values());
  }, [attendance, students, selectedClass, selectedDivision, selectedDateStr, selectedSubject, selectedFaculty, subjects, faculty]);

  const handleMarkAttendance = useCallback((studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Student';
    onMarkAttendance(studentId, selectedDateStr, status, undefined, selectedSubject || undefined, selectedFaculty || undefined);
    
    const subjectName = selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : '';
    const context = subjectName ? ` for ${subjectName}` : '';
    
    toast.success(`${studentName}${context} marked as ${status}`);
  }, [students, onMarkAttendance, selectedDateStr, selectedSubject, selectedFaculty, subjects]);

  const handleBulkAttendance = useCallback((status: 'present' | 'absent' | 'late' | 'excused') => {
    // Collect all students that need marking
    const studentsToMark = filteredStudentsBase.filter(student => {
      const existingAttendance = getAttendanceForStudent(student.id);
      return !existingAttendance;
    });
    
    if (studentsToMark.length === 0) {
      toast.info('All students already have attendance marked');
      return;
    }

    // Use bulk handler if available for single API call
    if (onBulkMarkAttendance) {
      const records = studentsToMark.map(student => ({
        studentId: student.id,
        date: selectedDateStr,
        status,
        subjectId: selectedSubject || undefined,
        facultyId: selectedFaculty || undefined,
      }));
      onBulkMarkAttendance(records);
      toast.success(`${studentsToMark.length} students marked as ${status}`);
    } else {
      // Fallback to individual calls
      studentsToMark.forEach(student => {
        onMarkAttendance(student.id, selectedDateStr, status, undefined, selectedSubject || undefined, selectedFaculty || undefined);
      });
      toast.success(`${studentsToMark.length} students marked as ${status}`);
    }
  }, [filteredStudentsBase, getAttendanceForStudent, onMarkAttendance, onBulkMarkAttendance, selectedDateStr, selectedSubject, selectedFaculty]);

  // Copy attendance from a previous class session
  const handleCopyFromPreviousClass = useCallback((sourceSubjectId: string | null, sourceFacultyId: string | null) => {
    // Get students who don't have attendance in current session but do have it in source session
    const studentsToCopy = filteredStudentsBase.filter(student => {
      // Skip if already has attendance in current session
      const existingAttendance = getAttendanceForStudent(student.id);
      if (existingAttendance) return false;
      
      // Check if student has attendance in source session
      const sourceAttendance = attendance.find(a => 
        a.studentId === student.id && 
        a.date === selectedDateStr &&
        a.subjectId === sourceSubjectId &&
        a.facultyId === sourceFacultyId
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
        a.subjectId === sourceSubjectId &&
        a.facultyId === sourceFacultyId
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

    // Use bulk handler if available
    if (onBulkMarkAttendance) {
      onBulkMarkAttendance(records);
    } else {
      // Fallback to individual calls
      records.forEach(record => {
        onMarkAttendance(record.studentId, record.date, record.status, record.notes, record.subjectId, record.facultyId);
      });
    }

    // Get source session name for toast
    const sourceSubjectName = sourceSubjectId 
      ? subjects.find(s => s.id === sourceSubjectId)?.name || 'Previous Class'
      : 'Previous Class';
    
    toast.success(`Copied attendance from ${sourceSubjectName} for ${records.length} students`);
  }, [filteredStudentsBase, getAttendanceForStudent, attendance, selectedDateStr, selectedSubject, selectedFaculty, onBulkMarkAttendance, onMarkAttendance, subjects]);

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
        {isFeatureEnabled('whatsapp_alerts') && selectedClass && stats.absent > 0 && (
          <Button
            onClick={() => setWhatsappDialogOpen(true)}
            className="w-full h-10 gap-2 bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Prepare Group Message ({stats.absent} absent)
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
                { value: 'all', label: 'All', count: filteredStudentsBase.length },
                { value: 'present', label: 'Present', count: stats.present, color: 'bg-green-100 text-green-700' },
                { value: 'absent', label: 'Absent', count: stats.absent, color: 'bg-red-100 text-red-700' },
                { value: 'late', label: 'Late', count: stats.late, color: 'bg-yellow-100 text-yellow-700' },
                { value: 'unmarked', label: 'Unmarked', count: filteredStudentsBase.length - (stats.present + stats.absent + stats.late + stats.excused) },
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
              disabled={!selectedClass || filteredStudentsBase.length === 0}
            >
              Mark All Present ({filteredStudentsBase.length})
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
