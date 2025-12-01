
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm shrink-0">
          {student.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm sm:text-base truncate">{student.name}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Class: {student.class}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
        <Button 
          size="sm" 
          variant={studentAttendance?.status === 'present' ? 'default' : 'outline'}
          onClick={() => onMarkAttendance(student.id, 'present')}
          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button 
          size="sm" 
          variant={studentAttendance?.status === 'absent' ? 'destructive' : 'outline'}
          onClick={() => onMarkAttendance(student.id, 'absent')}
          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button 
          size="sm" 
          variant={studentAttendance?.status === 'late' ? 'secondary' : 'outline'}
          onClick={() => onMarkAttendance(student.id, 'late')}
          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className={cn("h-8 w-8 sm:h-9 sm:w-9 p-0", studentAttendance?.status === 'excused' && 'bg-blue-100 text-blue-800')}
          onClick={() => onMarkAttendance(student.id, 'excused')}
        >
          <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
}
