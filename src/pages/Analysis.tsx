import { useSupabaseData } from '@/hooks/useSupabaseData';
import StudentAnalysis from '@/components/StudentAnalysis';
import { Loader2 } from 'lucide-react';

export default function AnalysisPage() {
  const { students, testResults, weeklyTests, loading } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <StudentAnalysis 
        students={students} 
        testResults={testResults}
        tests={weeklyTests}
      />
    </div>
  );
}
