import { useUserTuition } from '@/hooks/useUserTuition';
import {
  useDivisionsQuery,
  useSubjectsQuery,
  useFacultyQuery,
  useAddDivisionMutation,
  useUpdateDivisionMutation,
  useDeleteDivisionMutation,
  useAddSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useAddFacultyMutation,
  useUpdateFacultyMutation,
  useDeleteFacultyMutation,
} from '@/hooks/queries';
import { ClassManagement } from '@/components/ClassManagement';
import { ClassName } from '@/types';
import { Loader2 } from 'lucide-react';

export default function ClassesPage() {
  const { tuitionId } = useUserTuition();

  const { data: divisions = [], isLoading: divisionsLoading } = useDivisionsQuery(tuitionId);
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectsQuery(tuitionId);
  const { data: faculty = [], isLoading: facultyLoading } = useFacultyQuery(tuitionId);

  const addDivisionMut = useAddDivisionMutation(tuitionId);
  const updateDivisionMut = useUpdateDivisionMutation(tuitionId);
  const deleteDivisionMut = useDeleteDivisionMutation(tuitionId);
  const addSubjectMut = useAddSubjectMutation(tuitionId);
  const updateSubjectMut = useUpdateSubjectMutation(tuitionId);
  const deleteSubjectMut = useDeleteSubjectMutation(tuitionId);
  const addFacultyMut = useAddFacultyMutation(tuitionId);
  const updateFacultyMut = useUpdateFacultyMutation(tuitionId);
  const deleteFacultyMut = useDeleteFacultyMutation(tuitionId);

  const loading = divisionsLoading || subjectsLoading || facultyLoading;

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
        onAddDivision={(classValue: ClassName, name: string) => addDivisionMut.mutate({ classValue, name })}
        onUpdateDivision={(id: string, name: string) => updateDivisionMut.mutate({ id, name })}
        onDeleteDivision={(id: string) => deleteDivisionMut.mutate(id)}
        onAddSubject={(name: string, classValue: ClassName) => addSubjectMut.mutate({ name, classValue })}
        onUpdateSubject={(id: string, name: string, classValue: ClassName) => updateSubjectMut.mutate({ id, name, classValue })}
        onDeleteSubject={(id: string) => deleteSubjectMut.mutate(id)}
        onAddFaculty={(name: string, email: string, phone: string, subjectIds: string[]) => addFacultyMut.mutate({ name, email, phone, subjectIds })}
        onUpdateFaculty={(id: string, name: string, email: string, phone: string, subjectIds: string[]) => updateFacultyMut.mutate({ id, name, email, phone, subjectIds })}
        onDeleteFaculty={(id: string) => deleteFacultyMut.mutate(id)}
      />
    </div>
  );
}
