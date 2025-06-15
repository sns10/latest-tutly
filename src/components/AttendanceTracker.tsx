
import React, { useState } from 'react';
import { Student, StudentAttendance } from '@/types';
import { toast } from 'sonner';
import { AttendanceControls } from './attendance/AttendanceControls';
import { AttendanceStats } from './attendance/AttendanceStats';
import { StudentAttendanceList } from './attendance/StudentAttendanceList';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: StudentAttendance[];
  onMarkAttendance: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string) => void;
}

export function AttendanceTracker({ students, attendance, onMarkAttendance }: AttendanceTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('All');
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
    return attendance.find(a => a.studentId === studentId && a.date === selectedDateStr);
  };

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
    onMarkAttendance(studentId, selectedDateStr, status);
    toast.success(`Attendance for ${studentName} marked as ${status}.`);
  };

  const handleBulkAttendance = () => {
    let markedCount = 0;
    filteredStudents.forEach(student => {
      const existingAttendance = getAttendanceForStudent(student.id);
      if (!existingAttendance) {
        onMarkAttendance(student.id, selectedDateStr, bulkStatus);
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <AttendanceControls
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
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
