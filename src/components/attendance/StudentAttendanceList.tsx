
import React from 'react';
import { Student, StudentAttendance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentAttendanceRow } from './StudentAttendanceRow';

interface StudentAttendanceListProps {
  students: Student[];
  selectedDate: Date;
  getAttendanceForStudent: (studentId: string) => StudentAttendance | undefined;
  onMarkAttendance: (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
}

export function StudentAttendanceList({ students, selectedDate, getAttendanceForStudent, onMarkAttendance }: StudentAttendanceListProps) {
  // Sort students by roll number (students with roll numbers first, then alphabetically)
  const sortedStudents = [...students].sort((a, b) => {
    if (a.rollNo && b.rollNo) return a.rollNo - b.rollNo;
    if (a.rollNo && !b.rollNo) return -1;
    if (!a.rollNo && b.rollNo) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="bg-white shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle>
          Attendance for {selectedDate.toLocaleDateString()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedStudents.length > 0 ? (
            sortedStudents.map((student) => {
              const studentAttendance = getAttendanceForStudent(student.id);
              return (
                <StudentAttendanceRow
                  key={student.id}
                  student={student}
                  studentAttendance={studentAttendance}
                  onMarkAttendance={onMarkAttendance}
                />
              );
            })
          ) : (
            <p className="text-muted-foreground text-center py-4">No students found.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
