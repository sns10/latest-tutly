import React, { useRef, memo, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Student, StudentAttendance } from '@/types';
import { Button } from '@/components/ui/button';

interface VirtualizedStudentListProps {
  students: Student[];
  getAttendanceForStudent: (studentId: string) => StudentAttendance | undefined;
  onMarkAttendance: (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
}

// Memoized row component for optimal performance
const StudentRow = memo(function StudentRow({ 
  student, 
  status,
  onMarkAttendance 
}: { 
  student: Student; 
  status?: string;
  onMarkAttendance: (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
}) {
  const initials = useMemo(() => 
    student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    [student.name]
  );

  const handlePresent = useCallback(() => onMarkAttendance(student.id, 'present'), [student.id, onMarkAttendance]);
  const handleAbsent = useCallback(() => onMarkAttendance(student.id, 'absent'), [student.id, onMarkAttendance]);
  const handleLate = useCallback(() => onMarkAttendance(student.id, 'late'), [student.id, onMarkAttendance]);
  const handleExcused = useCallback(() => onMarkAttendance(student.id, 'excused'), [student.id, onMarkAttendance]);

  return (
    <div className="flex items-center justify-between gap-2 p-2 border rounded-lg bg-slate-50/50 touch-manipulation">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{student.name}</div>
          <div className="text-xs text-muted-foreground">
            {student.rollNo ? `#${student.rollNo} • ` : ''}{student.class}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button 
          size="sm" 
          variant={status === 'present' ? 'default' : 'outline'}
          onClick={handlePresent}
          className={`h-8 px-2 text-xs font-medium active:scale-95 transition-transform ${
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
          onClick={handleAbsent}
          className={`h-8 px-2 text-xs font-medium active:scale-95 transition-transform ${
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
          onClick={handleLate}
          className={`h-8 px-2 text-xs font-medium active:scale-95 transition-transform ${
            status === 'late' 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
              : 'hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300'
          }`}
        >
          L
        </Button>
        <Button 
          size="sm" 
          variant={status === 'excused' ? 'default' : 'outline'}
          onClick={handleExcused}
          className={`h-8 px-2 text-xs font-medium active:scale-95 transition-transform ${
            status === 'excused' 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
          }`}
        >
          E
        </Button>
      </div>
    </div>
  );
});

export const VirtualizedStudentList = memo(function VirtualizedStudentList({
  students,
  getAttendanceForStudent,
  onMarkAttendance
}: VirtualizedStudentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Prepare data with status for comparison
  const studentsWithStatus = useMemo(() => 
    students.map(student => ({
      student,
      status: getAttendanceForStudent(student.id)?.status
    })),
    [students, getAttendanceForStudent]
  );

  const virtualizer = useVirtualizer({
    count: studentsWithStatus.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Estimated row height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  if (students.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4 text-sm">No students found.</p>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[50vh] overflow-y-auto will-change-transform"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const { student, status } = studentsWithStatus[virtualItem.index];
          return (
            <div
              key={student.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="py-1"
            >
              <StudentRow
                student={student}
                status={status}
                onMarkAttendance={onMarkAttendance}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
