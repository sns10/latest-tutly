
import { useState } from "react";
import { WeeklyTest, StudentTestResult, Student } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTestDialog } from "./CreateTestDialog";
import { EnterMarksDialog } from "./EnterMarksDialog";
import { TestResultsView } from "./TestResultsView";
import { SmartboardView } from "./SmartboardView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestTube2, Users, BarChart3, Monitor } from "lucide-react";

interface WeeklyTestManagerProps {
  tests: WeeklyTest[];
  testResults: StudentTestResult[];
  students: Student[];
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
  onAddTestResult: (result: StudentTestResult) => void;
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
}

export function WeeklyTestManager({ 
  tests, 
  testResults, 
  students, 
  onAddTest, 
  onAddTestResult,
  onAwardXP 
}: WeeklyTestManagerProps) {
  const [selectedTest, setSelectedTest] = useState<WeeklyTest | null>(null);

  const getTestStats = (test: WeeklyTest) => {
    const results = testResults.filter(r => r.testId === test.id);
    const totalStudents = students.length;
    const studentsCompleted = results.length;
    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.marks / test.maxMarks) * 100, 0) / results.length 
      : 0;

    return {
      completed: studentsCompleted,
      total: totalStudents,
      average: Math.round(averageScore)
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Weekly Tests</h2>
          <p className="text-muted-foreground">Manage assessments and track student progress</p>
        </div>
        <CreateTestDialog onAddTest={onAddTest} />
      </div>

      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <TestTube2 className="h-4 w-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="marks" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Enter Marks
          </TabsTrigger>
          <TabsTrigger value="smartboard" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Smartboard
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TestTube2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests created yet</h3>
                <p className="text-muted-foreground mb-4">Create your first weekly test to get started</p>
                <CreateTestDialog onAddTest={onAddTest} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tests.map((test) => {
                const stats = getTestStats(test);
                return (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{test.name}</CardTitle>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">{test.subject}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(test.date).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Max: {test.maxMarks} marks
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {stats.completed}/{stats.total}
                          </div>
                          <div className="text-sm text-muted-foreground">completed</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="font-semibold">Avg Score: </span>
                            <span className={`font-bold ${stats.average >= 80 ? 'text-green-500' : stats.average >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {stats.average}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <EnterMarksDialog 
                            test={test} 
                            students={students}
                            existingResults={testResults.filter(r => r.testId === test.id)}
                            onAddResult={onAddTestResult}
                            onAwardXP={onAwardXP}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedTest(test)}
                          >
                            View Results
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marks">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Create a test first to enter marks</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tests.map((test) => (
                <Card key={test.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{test.name}</span>
                      <EnterMarksDialog 
                        test={test} 
                        students={students}
                        existingResults={testResults.filter(r => r.testId === test.id)}
                        onAddResult={onAddTestResult}
                        onAwardXP={onAwardXP}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="smartboard">
          <SmartboardView 
            tests={tests}
            testResults={testResults}
            students={students}
          />
        </TabsContent>

        <TabsContent value="reports">
          <TestResultsView 
            tests={tests}
            testResults={testResults}
            students={students}
          />
        </TabsContent>
      </Tabs>

      {selectedTest && (
        <TestResultsView 
          tests={[selectedTest]}
          testResults={testResults.filter(r => r.testId === selectedTest.id)}
          students={students}
        />
      )}
    </div>
  );
}
