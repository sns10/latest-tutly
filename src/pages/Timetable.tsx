import { useSupabaseData } from '@/hooks/useSupabaseData';
import { SchedulingModule } from '@/components/scheduling/SchedulingModule';
import { TimetablePageSkeleton } from '@/components/skeletons/PageSkeletons';
import { ClassName } from '@/types';

export default function TimetablePage() {
  const {
    faculty,
    subjects,
    timetable,
    rooms,
    divisions,
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
    notes?: string,
    divisionId?: string
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
      notes,
      divisionId
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
    endDate?: string,
    divisionId?: string
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
      endDate,
      undefined, // eventType
      undefined, // notes
      divisionId
    );
  };

  // Show skeleton during loading
  if (loading) {
    return <TimetablePageSkeleton />;
  }

  return (
    <SchedulingModule
      timetable={timetable}
      faculty={faculty}
      subjects={subjects}
      rooms={rooms}
      divisions={divisions}
      onAddEntry={handleAddEntry}
      onUpdateEntry={handleUpdateEntry}
      onDeleteEntry={deleteTimetableEntry}
      onAddRoom={addRoom}
      onUpdateRoom={updateRoom}
      onDeleteRoom={deleteRoom}
    />
  );
}