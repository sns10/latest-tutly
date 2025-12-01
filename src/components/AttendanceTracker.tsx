import React, { useState } from 'react';
import { Student, StudentAttendance, Timetable, Subject, Faculty } from '@/types';
import { toast } from 'sonner';
import { AttendanceControls } from './attendance/AttendanceControls';
import { AttendanceStats } from './attendance/AttendanceStats';
import { StudentAttendanceList } from './attendance/StudentAttendanceList';
import { ReportExporter } from './ReportExporter';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: StudentAttendance[];
  timetable?: Timetable[];
  subjects?: Subject[];
  faculty?: Faculty[];
  onMarkAttendance: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string, subjectId?: string, facultyId?: string) => void;
}

export function AttendanceTracker({ students, attendance, timetable = [], subjects = [], faculty = [], onMarkAttendance }: AttendanceTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const selectedDateStr = formatDate(selectedDate);

  // Filter students by class and search query
  const classFilteredStudents = selectedClass === 'All' 
    ? students 
    : students.filter(s => s.class === selectedClass);
  
  const filteredStudents = classFilteredStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get attendance for selected date
  const getAttendanceForStudent = (studentId: string) => {
    let matchingAttendance = attendance.filter(a => a.studentId === studentId && a.date === selectedDateStr);
    
    // If subject/faculty is selected, filter by those too
    if (selectedSubject) {
      matchingAttendance = matchingAttendance.filter(a => a.subjectId === selectedSubject);
    }
    if (selectedFaculty) {
      matchingAttendance = matchingAttendance.filter(a => a.facultyId === selectedFaculty);
    }
    
    return matchingAttendance[0];
  };

  // Get available subjects and faculty based on selected class and day
  const dayOfWeek = selectedDate.getDay();
  const availableTimetableEntries = timetable.filter(t => 
    (selectedClass === 'All' || t.class === selectedClass) && 
    t.dayOfWeek === dayOfWeek
  );
  const availableSubjects = subjects.filter(s => 
    selectedClass === 'All' || s.class === selectedClass
  );
  const availableFaculty = selectedFaculty 
    ? faculty.filter(f => f.id === selectedFaculty)
    : faculty;

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    const totalStudents = filteredStudents.length;
    const dateAttendance = attendance.filter(a => a.date === selectedDateStr && filteredStudents.some(s => s.id === a.studentId));
    const present = dateAttendance.filter(a => a.status === 'present').length;
    const absent = dateAttendance.filter(a => a.status === 'absent').length;
    const late = dateAttendance.filter(a => a.status === 'late').length;
    const excused = dateAttendance.filter(a => a.status === 'excused').length;

    return { totalStudents, present, absent, late, excused };
  };

  const stats = getAttendanceStats();

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Student';
    onMarkAttendance(studentId, selectedDateStr, status, undefined, selectedSubject || undefined, selectedFaculty || undefined);
    
    const subjectName = selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : '';
    const facultyName = selectedFaculty ? faculty.find(f => f.id === selectedFaculty)?.name : '';
    const context = subjectName && facultyName ? ` for ${subjectName} (${facultyName})` : subjectName ? ` for ${subjectName}` : '';
    
    toast.success(`Attendance for ${studentName}${context} marked as ${status}.`);
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
      toast.success(`${markedCount} unmarked student(s) have been marked as ${bulkStatus}.`);
    } else {
      toast.info("All visible students already have an attendance status for this date.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Attendance Tracker</h2>
          <p className="text-muted-foreground">Track and manage student attendance</p>
        </div>
        <ReportExporter
          type="absentees"
          label="Export Absentees"
          classValue={selectedClass === 'All' ? undefined : selectedClass}
          startDate={selectedDateStr}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <AttendanceControls
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          selectedFaculty={selectedFaculty}
          onFacultyChange={setSelectedFaculty}
          availableSubjects={availableSubjects}
          availableFaculty={availableFaculty}
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          bulkStatus={bulkStatus}
          onBulkStatusChange={setBulkStatus}
          onBulkMark={handleBulkAttendance}
        />

        <div className="lg:col-span-3 space-y-6">
          <AttendanceStats stats={stats} />
          <StudentAttendanceList
            students={filteredStudents}
            selectedDate={selectedDate}
            getAttendanceForStudent={getAttendanceForStudent}
            onMarkAttendance={handleMarkAttendance}
          />
        </div>
      </div>
    </div>
  );
}
