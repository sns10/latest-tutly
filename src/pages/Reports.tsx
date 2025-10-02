import { useSupabaseData } from '@/hooks/useSupabaseData';
import { TestResultsView } from '@/components/TestResultsView';
import { Loader2 } from 'lucide-react';

export default function ReportsPage() {
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
      <TestResultsView 
        tests={weeklyTests}
        testResults={testResults}
        students={students}
      />
    </div>
  );
}
