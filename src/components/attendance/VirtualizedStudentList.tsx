import React, { useRef, memo, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Student, StudentAttendance } from '@/types';
import { Button } from '@/components/ui/button';

interface VirtualizedStudentListProps {
  students: Student[];
  getAttendanceForStudent: (studentId: string) => StudentAttendance | undefined;
  /** True when the shown status comes from a general (no subject/faculty)
   *  same-day record rather than the selected session. */
  isFallbackStatus?: (studentId: string) => boolean;
  onMarkAttendance: (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
}

// Memoized row component for optimal performance
const StudentRow = memo(function StudentRow({ 
  student, 
  status,
  isFallback,
  onMarkAttendance 
}: { 
  student: Student; 
  status?: string;
  isFallback?: boolean;
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

  const buttonTouchStyle = { touchAction: 'manipulation' as const, WebkitTapHighlightColor: 'transparent' };
  const stopParentGesture = useCallback((e: React.PointerEvent) => { e.stopPropagation(); }, []);

  // A fallback status is only a hint from another session — never render it as
  // a confirmed mark for the currently selected subject/faculty.
  const activeStatus = isFallback ? undefined : status;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 border rounded-lg bg-slate-50/50 touch-manipulation">
      <div className="flex items-center gap-2 min-w-0 w-full sm:flex-1">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-xs sm:text-sm break-words sm:truncate leading-snug">{student.name}</div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">
            {student.rollNo ? `#${student.rollNo} • ` : ''}{student.class}
            {isFallback && status ? (
              <span className="ml-1 italic text-amber-600">• {status} (general, not this session)</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto">
        <Button 
          size="sm" 
          variant={activeStatus === 'present' ? 'default' : 'outline'}
          onClick={handlePresent}
          onPointerDown={stopParentGesture}
          style={buttonTouchStyle}
          className={`h-10 min-w-[40px] px-2.5 text-xs font-medium ${
            activeStatus === 'present' 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : `hover:bg-green-50 hover:text-green-700 hover:border-green-300${isFallback && status === 'present' ? ' border-green-400 text-green-700 border-dashed' : ''}`
          }`}
        >
          P
        </Button>
        <Button 
          size="sm" 
          variant={activeStatus === 'absent' ? 'destructive' : 'outline'}
          onClick={handleAbsent}
          onPointerDown={stopParentGesture}
          style={buttonTouchStyle}
          className={`h-10 min-w-[40px] px-2.5 text-xs font-medium ${
            activeStatus === 'absent' 
              ? '' 
              : `hover:bg-red-50 hover:text-red-700 hover:border-red-300${isFallback && status === 'absent' ? ' border-red-400 text-red-700 border-dashed' : ''}`
          }`}
        >
          A
        </Button>
        <Button 
          size="sm" 
          variant={activeStatus === 'late' ? 'secondary' : 'outline'}
          onClick={handleLate}
          onPointerDown={stopParentGesture}
          style={buttonTouchStyle}
          className={`h-10 min-w-[40px] px-2.5 text-xs font-medium ${
            activeStatus === 'late' 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
              : `hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300${isFallback && status === 'late' ? ' border-yellow-400 text-yellow-700 border-dashed' : ''}`
          }`}
        >
          L
        </Button>
        <Button 
          size="sm" 
          variant={activeStatus === 'excused' ? 'default' : 'outline'}
          onClick={handleExcused}
          onPointerDown={stopParentGesture}
          style={buttonTouchStyle}
          className={`h-10 min-w-[40px] px-2.5 text-xs font-medium ${
            activeStatus === 'excused' 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : `hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300${isFallback && status === 'excused' ? ' border-blue-400 text-blue-700 border-dashed' : ''}`
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
  isFallbackStatus,
  onMarkAttendance
}: VirtualizedStudentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Prepare data with status for comparison
  const studentsWithStatus = useMemo(() => 
    students.map(student => ({
      student,
      status: getAttendanceForStudent(student.id)?.status,
      isFallback: isFallbackStatus ? isFallbackStatus(student.id) : false,
    })),
    [students, getAttendanceForStudent, isFallbackStatus]
  );

  const virtualizer = useVirtualizer({
    count: studentsWithStatus.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 88,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  if (students.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4 text-sm">No students found.</p>
    );
  }

  // Calculate dynamic height - min 200px, max 50vh, or content height if smaller
  const contentHeight = studentsWithStatus.length * 88;
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400;
  const containerHeight = Math.min(Math.max(contentHeight, 200), maxHeight);

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto will-change-transform"
      style={{ 
        height: `${containerHeight}px`,
        minHeight: '200px',
        maxHeight: '50vh',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const { student, status, isFallback } = studentsWithStatus[virtualItem.index];
          return (
            <div
              key={student.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                minHeight: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="py-1"
            >
              <StudentRow
                student={student}
                status={status}
                isFallback={isFallback}
                onMarkAttendance={onMarkAttendance}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
