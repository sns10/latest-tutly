import { useSupabaseData } from '@/hooks/useSupabaseData';
import { TimetableManager } from '@/components/TimetableManager';
import { Loader2 } from 'lucide-react';

export default function TimetablePage() {
  const {
    faculty,
    subjects,
    timetable,
    loading,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
  } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TimetableManager
      timetable={timetable}
      faculty={faculty}
      subjects={subjects}
      onAddEntry={addTimetableEntry}
      onUpdateEntry={updateTimetableEntry}
      onDeleteEntry={deleteTimetableEntry}
    />
  );
}
