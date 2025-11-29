import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WeeklyTest, StudentTestResult, Student } from '@/types';
import { ChevronRight } from 'lucide-react';
import { EnterMarksDialog } from './EnterMarksDialog';

interface RecentTestsProps {
  tests: WeeklyTest[];
  testResults: StudentTestResult[];
  students: Student[];
  onAddTestResult: (result: StudentTestResult) => void;
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
}

export function RecentTests({ 
  tests, 
  testResults, 
  students,
  onAddTestResult,
  onAwardXP 
}: RecentTestsProps) {
  const recentTests = tests.slice(0, 3);

  const getTestStats = (test: WeeklyTest) => {
    const eligibleStudents = test.class === "All" 
      ? students 
      : students.filter(s => s.class === test.class);
    
    const results = testResults.filter(r => r.testId === test.id);
    const totalStudents = eligibleStudents.length;
    const studentsCompleted = results.length;

    return {
      completed: studentsCompleted,
      total: totalStudents,
    };
  };

  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">Recent Tests</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            View All
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentTests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tests created yet
          </p>
        ) : (
          recentTests.map((test) => {
            const stats = getTestStats(test);
            return (
              <div
                key={test.id}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{test.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{test.subject}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                </div>
                <div className="ml-2">
                  <EnterMarksDialog 
                    test={test} 
                    students={students}
                    existingResults={testResults.filter(r => r.testId === test.id)}
                    onAddResult={onAddTestResult}
                    onAwardXP={onAwardXP}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
