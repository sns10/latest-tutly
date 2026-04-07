import { useUserTuition } from '@/hooks/useUserTuition';
import {
  useFacultyQuery,
  useSubjectsQuery,
  useTimetableQuery,
  useRoomsQuery,
  useDivisionsQuery,
  useAddTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
  useDeleteTimetableEntryMutation,
  useAddRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
} from '@/hooks/queries';
import { SchedulingModule } from '@/components/scheduling/SchedulingModule';
import { TimetablePageSkeleton } from '@/components/skeletons/PageSkeletons';
import { ClassName } from '@/types';

export default function TimetablePage() {
  const { tuitionId } = useUserTuition();

  const { data: faculty = [] } = useFacultyQuery(tuitionId);
  const { data: subjects = [] } = useSubjectsQuery(tuitionId);
  const { data: timetable = [], isLoading } = useTimetableQuery(tuitionId);
  const { data: rooms = [] } = useRoomsQuery(tuitionId);
  const { data: divisions = [] } = useDivisionsQuery(tuitionId);

  const addTimetableMut = useAddTimetableEntryMutation(tuitionId);
  const updateTimetableMut = useUpdateTimetableEntryMutation(tuitionId);
  const deleteTimetableMut = useDeleteTimetableEntryMutation(tuitionId);
  const addRoomMut = useAddRoomMutation(tuitionId);
  const updateRoomMut = useUpdateRoomMutation(tuitionId);
  const deleteRoomMut = useDeleteRoomMutation(tuitionId);

  const handleAddEntry = async (
    classValue: ClassName, subjectId: string, facultyId: string,
    dayOfWeek: number, startTime: string, endTime: string,
    type: 'regular' | 'special', roomId?: string, roomNumber?: string,
    specificDate?: string, eventType?: string, notes?: string, divisionId?: string
  ) => {
    addTimetableMut.mutate({
      classValue, subjectId, facultyId, dayOfWeek, startTime, endTime, type,
      roomId, roomNumber, specificDate, eventType, notes, divisionId,
    });
  };

  const handleUpdateEntry = async (
    id: string, classValue: ClassName, subjectId: string, facultyId: string,
    dayOfWeek: number, startTime: string, endTime: string,
    type: 'regular' | 'special', roomId?: string, roomNumber?: string,
    specificDate?: string, startDate?: string, endDate?: string, divisionId?: string
  ) => {
    updateTimetableMut.mutate({
      id, classValue, subjectId, facultyId, dayOfWeek, startTime, endTime, type,
      roomId, roomNumber, specificDate, startDate, endDate, divisionId,
    });
  };

  const addRoom = async (name: string, capacity?: number, description?: string) => {
    addRoomMut.mutate({ name, capacity, description });
  };

  const updateRoom = async (id: string, name: string, capacity?: number, description?: string) => {
    updateRoomMut.mutate({ id, name, capacity, description });
  };

  const deleteRoom = async (id: string) => {
    deleteRoomMut.mutate(id);
  };

  if (isLoading) {
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
      onDeleteEntry={async (id: string) => { deleteTimetableMut.mutate(id); }}
      onAddRoom={addRoom}
      onUpdateRoom={updateRoom}
      onDeleteRoom={deleteRoom}
    />
  );
}
