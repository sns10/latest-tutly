import { useSupabaseData } from '@/hooks/useSupabaseData';
import { SchedulingModule } from '@/components/scheduling/SchedulingModule';
import { Loader2 } from 'lucide-react';
import { ClassName } from '@/types';

export default function TimetablePage() {
  const {
    faculty,
    subjects,
    timetable,
    rooms,
    loading,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    addRoom,
    updateRoom,
    deleteRoom,
  } = useSupabaseData();

  // Wrapper to handle the extended parameters for adding entries
  const handleAddEntry = async (
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomId?: string,
    roomNumber?: string,
    specificDate?: string,
    eventType?: string,
    notes?: string
  ) => {
    await addTimetableEntry(
      classValue,
      subjectId,
      facultyId,
      dayOfWeek,
      startTime,
      endTime,
      type,
      roomId,
      roomNumber,
      specificDate,
      undefined, // startDate
      undefined, // endDate
      eventType,
      notes
    );
  };

  // Wrapper for updating entries
  const handleUpdateEntry = async (
    id: string,
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomId?: string,
    roomNumber?: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string
  ) => {
    await updateTimetableEntry(
      id,
      classValue,
      subjectId,
      facultyId,
      dayOfWeek,
      startTime,
      endTime,
      type,
      roomId,
      roomNumber,
      specificDate,
      startDate,
      endDate
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SchedulingModule
      timetable={timetable}
      faculty={faculty}
      subjects={subjects}
      rooms={rooms}
      onAddEntry={handleAddEntry}
      onUpdateEntry={handleUpdateEntry}
      onDeleteEntry={deleteTimetableEntry}
      onAddRoom={addRoom}
      onUpdateRoom={updateRoom}
      onDeleteRoom={deleteRoom}
    />
  );
}
