import { useSupabaseData } from '@/hooks/useSupabaseData';
import { ClassManagement } from '@/components/ClassManagement';
import { Loader2 } from 'lucide-react';

export default function ClassesPage() {
  const { 
    divisions, 
    subjects,
    faculty,
    loading,
    addDivision,
    updateDivision,
    deleteDivision,
    addSubject,
    addFaculty,
    updateFaculty,
    deleteFaculty
  } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <ClassManagement
        divisions={divisions}
        subjects={subjects}
        faculty={faculty}
        onAddDivision={addDivision}
        onUpdateDivision={updateDivision}
        onDeleteDivision={deleteDivision}
        onAddSubject={addSubject}
        onAddFaculty={addFaculty}
        onUpdateFaculty={updateFaculty}
        onDeleteFaculty={deleteFaculty}
      />
    </div>
  );
}
