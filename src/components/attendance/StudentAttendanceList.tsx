
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Attendance for {selectedDate.toLocaleDateString()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {students.length > 0 ? (
            students.map((student) => {
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
