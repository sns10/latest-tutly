
import React from 'react';
import { Student, StudentAttendance } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface StudentAttendanceRowProps {
  student: Student;
  studentAttendance?: StudentAttendance;
  onMarkAttendance: (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
}

export function StudentAttendanceRow({ student, studentAttendance, onMarkAttendance }: StudentAttendanceRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          {student.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="font-medium">{student.name}</div>
          <div className="text-sm text-muted-foreground">Class: {student.class}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={studentAttendance?.status === 'present' ? 'default' : 'outline'}
            onClick={() => onMarkAttendance(student.id, 'present')}
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant={studentAttendance?.status === 'absent' ? 'destructive' : 'outline'}
            onClick={() => onMarkAttendance(student.id, 'absent')}
          >
            <XCircle className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant={studentAttendance?.status === 'late' ? 'secondary' : 'outline'}
            onClick={() => onMarkAttendance(student.id, 'late')}
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className={cn(studentAttendance?.status === 'excused' && 'bg-blue-100 text-blue-800')}
            onClick={() => onMarkAttendance(student.id, 'excused')}
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
