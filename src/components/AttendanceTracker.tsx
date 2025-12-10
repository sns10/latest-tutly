import React, { useState, useEffect, useMemo } from 'react';
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
import { StudentAttendanceList } from './attendance/StudentAttendanceList';
import { ReportExporter } from './ReportExporter';
import { WhatsAppMessageDialog } from './attendance/WhatsAppMessageDialog';
import { Clock, BookOpen, UserCircle, Search, AlertCircle, RefreshCw, CalendarDays, Users, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: StudentAttendance[];
  timetable?: Timetable[];
  subjects?: Subject[];
  faculty?: Faculty[];
  divisions?: Division[];
  onMarkAttendance: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string, subjectId?: string, facultyId?: string) => void;
}

const CLASSES: ClassName[] = ['8th', '9th', '10th', '11th', '12th'];

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
  onMarkAttendance 
}: AttendanceTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  
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

  // Smart Check: Detect ongoing class from timetable (regular + special)
  useEffect(() => {
    if (isManualMode) return;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

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
  }, [timetable, subjects, faculty, isManualMode]);

  // Get available divisions for selected class
  const availableDivisions = useMemo(() => {
    if (!selectedClass) return [];
    return divisions.filter(d => d.class === selectedClass);
  }, [divisions, selectedClass]);

  // Filter students by class, division and search query
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter(s => s.class === selectedClass)
      .filter(s => !selectedDivision || s.divisionId === selectedDivision)
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, selectedClass, selectedDivision, searchQuery]);

  // Get attendance for selected date - must match exact subject/faculty context
  const getAttendanceForStudent = (studentId: string) => {
    return attendance.find(a => {
      if (a.studentId !== studentId || a.date !== selectedDateStr) return false;
      
      // Match subject: if selectedSubject is set, must match; if not set, attendance must have no subject
      const subjectMatches = selectedSubject 
        ? a.subjectId === selectedSubject 
        : !a.subjectId;
      
      // Match faculty: if selectedFaculty is set, must match; if not set, attendance must have no faculty
      const facultyMatches = selectedFaculty 
        ? a.facultyId === selectedFaculty 
        : !a.facultyId;
      
      return subjectMatches && facultyMatches;
    });
  };

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

  // Calculate attendance statistics - must match exact subject/faculty context
  const stats = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const dateAttendance = attendance.filter(a => {
      if (a.date !== selectedDateStr) return false;
      if (!filteredStudents.some(s => s.id === a.studentId)) return false;
      
      // Match exact subject/faculty context
      const subjectMatches = selectedSubject 
        ? a.subjectId === selectedSubject 
        : !a.subjectId;
      const facultyMatches = selectedFaculty 
        ? a.facultyId === selectedFaculty 
        : !a.facultyId;
      
      return subjectMatches && facultyMatches;
    });
    
    return {
      totalStudents,
      present: dateAttendance.filter(a => a.status === 'present').length,
      absent: dateAttendance.filter(a => a.status === 'absent').length,
      late: dateAttendance.filter(a => a.status === 'late').length,
      excused: dateAttendance.filter(a => a.status === 'excused').length,
    };
  }, [filteredStudents, attendance, selectedDateStr, selectedSubject, selectedFaculty]);

  // Get absentees for WhatsApp message
  const absentees = useMemo(() => {
    return filteredStudents.filter(student => {
      const studentAttendance = getAttendanceForStudent(student.id);
      return studentAttendance?.status === 'absent';
    });
  }, [filteredStudents, attendance, selectedDateStr, selectedSubject, selectedFaculty]);

  // Get late students for WhatsApp message
  const lateStudents = useMemo(() => {
    return filteredStudents.filter(student => {
      const studentAttendance = getAttendanceForStudent(student.id);
      return studentAttendance?.status === 'late';
    });
  }, [filteredStudents, attendance, selectedDateStr, selectedSubject, selectedFaculty]);

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Student';
    onMarkAttendance(studentId, selectedDateStr, status, undefined, selectedSubject || undefined, selectedFaculty || undefined);
    
    const subjectName = selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : '';
    const context = subjectName ? ` for ${subjectName}` : '';
    
    toast.success(`${studentName}${context} marked as ${status}`);
  };

  const handleBulkAttendance = (status: 'present' | 'absent' | 'late' | 'excused') => {
    let markedCount = 0;
    
    filteredStudents.forEach(student => {
      const existingAttendance = getAttendanceForStudent(student.id);
      if (!existingAttendance) {
        onMarkAttendance(student.id, selectedDateStr, status, undefined, selectedSubject || undefined, selectedFaculty || undefined);
        markedCount++;
      }
    });
    
    if (markedCount > 0) {
      toast.success(`${markedCount} students marked as ${status}`);
    } else {
      toast.info('All students already have attendance marked');
    }
  };

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground text-xs">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
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

        {/* Prepare WhatsApp Message - Show when class selected and attendance marked */}
        {selectedClass && stats.absent > 0 && (
          <Button
            onClick={() => setWhatsappDialogOpen(true)}
            className="w-full h-10 gap-2 bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Prepare Group Message ({stats.absent} absent)
          </Button>
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
              disabled={!selectedClass || filteredStudents.length === 0}
            >
              Mark All Present ({filteredStudents.length})
            </Button>
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
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const studentAttendance = getAttendanceForStudent(student.id);
                    return (
                      <StudentAttendanceRow
                        key={student.id}
                        student={student}
                        studentAttendance={studentAttendance}
                        onMarkAttendance={handleMarkAttendance}
                      />
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm">No students found.</p>
                )}
              </div>
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

          {/* Attendance Summary - Collapsible */}
          {selectedClass && (
            <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
              <Card className="bg-white shadow-sm border-slate-200 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Summary</span>
                      <span className="text-xs text-muted-foreground">
                        {stats.present}P / {stats.absent}A / {stats.late}L
                      </span>
                    </div>
                    {statsOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 border-t border-slate-100">
                    <AttendanceStats stats={stats} />
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

// Inline compact student row component for better UX
function StudentAttendanceRow({ 
  student, 
  studentAttendance, 
  onMarkAttendance 
}: { 
  student: Student; 
  studentAttendance?: StudentAttendance; 
  onMarkAttendance: (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
}) {
  const status = studentAttendance?.status;
  
  return (
    <div className="flex items-center justify-between gap-2 p-2 border rounded-lg bg-slate-50/50">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
          {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{student.name}</div>
          <div className="text-xs text-muted-foreground">{student.class}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button 
          size="sm" 
          variant={status === 'present' ? 'default' : 'outline'}
          onClick={() => onMarkAttendance(student.id, 'present')}
          className={`h-8 px-3 text-xs font-medium ${
            status === 'present' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
          }`}
        >
          P
        </Button>
        <Button 
          size="sm" 
          variant={status === 'absent' ? 'destructive' : 'outline'}
          onClick={() => onMarkAttendance(student.id, 'absent')}
          className={`h-8 px-3 text-xs font-medium ${
            status === 'absent' 
              ? '' 
              : 'hover:bg-red-50 hover:text-red-700 hover:border-red-300'
          }`}
        >
          A
        </Button>
        <Button 
          size="sm" 
          variant={status === 'late' ? 'secondary' : 'outline'}
          onClick={() => onMarkAttendance(student.id, 'late')}
          className={`h-8 px-3 text-xs font-medium ${
            status === 'late' 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
              : 'hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300'
          }`}
        >
          L
        </Button>
      </div>
    </div>
  );
}
