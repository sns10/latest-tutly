import React, { useState, useEffect, useMemo } from 'react';
import { Student, StudentAttendance, Timetable, Subject, Faculty, ClassName } from '@/types';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttendanceStats } from './attendance/AttendanceStats';
import { StudentAttendanceList } from './attendance/StudentAttendanceList';
import { ReportExporter } from './ReportExporter';
import { Clock, BookOpen, UserCircle, Search, AlertCircle, RefreshCw, CalendarDays } from 'lucide-react';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: StudentAttendance[];
  timetable?: Timetable[];
  subjects?: Subject[];
  faculty?: Faculty[];
  onMarkAttendance: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string, subjectId?: string, facultyId?: string) => void;
}

const CLASSES: ClassName[] = ['8th', '9th', '10th', '11th'];

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
  onMarkAttendance 
}: AttendanceTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [detectedClass, setDetectedClass] = useState<DetectedClass | null>(null);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const selectedDateStr = formatDate(selectedDate);

  // Smart Check: Detect ongoing class from timetable
  useEffect(() => {
    if (isManualMode) return;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find matching timetable entry for current day and time
    const ongoingEntry = timetable.find(entry => {
      if (entry.type !== 'regular' || entry.dayOfWeek !== currentDay) return false;
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

  // Filter students by class and search query
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter(s => s.class === selectedClass)
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, selectedClass, searchQuery]);

  // Get attendance for selected date
  const getAttendanceForStudent = (studentId: string) => {
    let matchingAttendance = attendance.filter(a => a.studentId === studentId && a.date === selectedDateStr);
    
    if (selectedSubject) {
      matchingAttendance = matchingAttendance.filter(a => a.subjectId === selectedSubject);
    }
    if (selectedFaculty) {
      matchingAttendance = matchingAttendance.filter(a => a.facultyId === selectedFaculty);
    }
    
    return matchingAttendance[0];
  };

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

  // Calculate attendance statistics
  const stats = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const dateAttendance = attendance.filter(a => 
      a.date === selectedDateStr && 
      filteredStudents.some(s => s.id === a.studentId) &&
      (!selectedSubject || a.subjectId === selectedSubject) &&
      (!selectedFaculty || a.facultyId === selectedFaculty)
    );
    
    return {
      totalStudents,
      present: dateAttendance.filter(a => a.status === 'present').length,
      absent: dateAttendance.filter(a => a.status === 'absent').length,
      late: dateAttendance.filter(a => a.status === 'late').length,
      excused: dateAttendance.filter(a => a.status === 'excused').length,
    };
  }, [filteredStudents, attendance, selectedDateStr, selectedSubject, selectedFaculty]);

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Student';
    onMarkAttendance(studentId, selectedDateStr, status, undefined, selectedSubject || undefined, selectedFaculty || undefined);
    
    const subjectName = selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : '';
    const context = subjectName ? ` for ${subjectName}` : '';
    
    toast.success(`${studentName}${context} marked as ${status}`);
  };

  const handleBulkAttendance = () => {
    let markedCount = 0;
    
    filteredStudents.forEach(student => {
      const existingAttendance = getAttendanceForStudent(student.id);
      if (!existingAttendance) {
        onMarkAttendance(student.id, selectedDateStr, bulkStatus, undefined, selectedSubject || undefined, selectedFaculty || undefined);
        markedCount++;
      }
    });
    
    if (markedCount > 0) {
      toast.success(`${markedCount} students marked as ${bulkStatus}`);
    } else {
      toast.info('All students already have attendance marked');
    }
  };

  const handleSwitchToManual = () => {
    setIsManualMode(true);
    setDetectedClass(null);
    setSelectedClass('');
    setSelectedSubject('');
    setSelectedFaculty('');
  };

  const handleRefreshDetection = () => {
    setIsManualMode(false);
    setDetectedClass(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
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

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance Tracker</h1>
            <p className="text-muted-foreground text-sm">Track and manage student attendance</p>
          </div>
          <div className="flex gap-2">
            {isManualMode && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshDetection}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Auto-detect
              </Button>
            )}
            <ReportExporter
              type="absentees"
              label="Export Absentees"
              classValue={selectedClass || undefined}
              startDate={selectedDateStr}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-4">
            {/* Date Picker Card */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Select Date</Label>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border border-slate-200 pointer-events-auto"
                />
              </CardContent>
            </Card>

            {/* Filters Card */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardContent className="p-4 space-y-4">
                {/* Class Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Filter by Class</Label>
                  <Select value={selectedClass} onValueChange={(value) => {
                    setSelectedClass(value);
                    setSelectedSubject('');
                    setSelectedFaculty('');
                  }}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {CLASSES.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls} Grade</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4" />
                    Subject
                  </Label>
                  <Select 
                    value={selectedSubject} 
                    onValueChange={setSelectedSubject}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="">All subjects</SelectItem>
                      {availableSubjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Faculty Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <UserCircle className="h-4 w-4" />
                    Faculty
                  </Label>
                  <Select 
                    value={selectedFaculty} 
                    onValueChange={setSelectedFaculty}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="All faculty" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="">All faculty</SelectItem>
                      {availableFaculty.map(fac => (
                        <SelectItem key={fac.id} value={fac.id}>
                          {fac.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-sm">Search Student</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Label className="text-sm">Bulk Mark As</Label>
                  <Select value={bulkStatus} onValueChange={(v: any) => setBulkStatus(v)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkAttendance} 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    size="sm"
                    disabled={!selectedClass}
                  >
                    Mark All Unmarked
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Student List */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedClass ? (
              <Card className="bg-white shadow-sm border-slate-200">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Select a Class</h3>
                  <p className="text-muted-foreground">
                    Choose a class from the filter to view and mark student attendance
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <AttendanceStats stats={stats} />
                <StudentAttendanceList
                  students={filteredStudents}
                  selectedDate={selectedDate}
                  getAttendanceForStudent={getAttendanceForStudent}
                  onMarkAttendance={handleMarkAttendance}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
