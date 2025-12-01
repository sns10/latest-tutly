import { useSupabaseData } from '@/hooks/useSupabaseData';
import { TimetableManager } from '@/components/TimetableManager';
import { FacultyManager } from '@/components/FacultyManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export default function TimetablePage() {
  const {
    faculty,
    subjects,
    timetable,
    loading,
    addFaculty,
    updateFaculty,
    deleteFaculty,
    addSubject,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
  } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Tabs defaultValue="timetable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
        </TabsList>

        <TabsContent value="timetable">
          <TimetableManager
            timetable={timetable}
            faculty={faculty}
            subjects={subjects}
            onAddEntry={addTimetableEntry}
            onUpdateEntry={updateTimetableEntry}
            onDeleteEntry={deleteTimetableEntry}
          />
        </TabsContent>

        <TabsContent value="faculty">
          <FacultyManager
            faculty={faculty}
            subjects={subjects}
            onAddFaculty={addFaculty}
            onUpdateFaculty={updateFaculty}
            onDeleteFaculty={deleteFaculty}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
