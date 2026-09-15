import { useUserTuition } from '@/hooks/useUserTuition';
import { useTuitionInfo } from '@/hooks/useTuitionInfo';
import { useFacultyQuery, useSubjectsQuery } from '@/hooks/queries';
import { FacultySalaryModule } from '@/components/faculty/FacultySalaryModule';
import { Loader2 } from 'lucide-react';

export default function FacultySalaryPage() {
  const { tuitionId } = useUserTuition();
  const { tuition } = useTuitionInfo();
  const { data: faculty = [], isLoading: facultyLoading } = useFacultyQuery(tuitionId);
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectsQuery(tuitionId);

  if (facultyLoading || subjectsLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6">
      <FacultySalaryModule
        faculty={faculty}
        subjects={subjects}
        tuitionId={tuitionId}
        tuitionName={tuition?.name}
      />
    </div>
  );
}
