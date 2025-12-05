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
    updateSubject,
    deleteSubject,
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
    <div className="w-full px-3 py-4 sm:px-6 space-y-4">
      <ClassManagement
        divisions={divisions}
        subjects={subjects}
        faculty={faculty}
        onAddDivision={addDivision}
        onUpdateDivision={updateDivision}
        onDeleteDivision={deleteDivision}
        onAddSubject={addSubject}
        onUpdateSubject={updateSubject}
        onDeleteSubject={deleteSubject}
        onAddFaculty={addFaculty}
        onUpdateFaculty={updateFaculty}
        onDeleteFaculty={deleteFaculty}
      />
    </div>
  );
}
