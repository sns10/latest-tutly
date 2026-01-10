import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useTermExamData } from "@/hooks/useTermExamData";
import { useTuitionFeatures } from "@/hooks/useTuitionFeatures";
import { useTuitionInfo } from "@/hooks/useTuitionInfo";
import { CreateTestDialog } from "@/components/CreateTestDialog";
import { EnterMarksDialog } from "@/components/EnterMarksDialog";
import { TermExamManager } from "@/components/term-exams/TermExamManager";
import { ClipboardList, GraduationCap, Trash2, Search, Filter, Loader2 } from "lucide-react";

const TestsPage = () => {
  const { isFeatureEnabled, loading: featuresLoading } = useTuitionFeatures();
  const { tuition } = useTuitionInfo();
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');

  const {
    students,
    weeklyTests,
    testResults,
    subjects,
    divisions,
    loading,
    addWeeklyTest,
    deleteWeeklyTest,
    addTestResult,
    addTestResultsBatch,
    awardXP,
  } = useSupabaseData();

  const {
    termExams,
    termExamSubjects,
    termExamResults,
    loading: termExamLoading,
    addTermExam,
    deleteTermExam,
    addTermExamResult,
    bulkAddTermExamResults,
  } = useTermExamData();

  const isTermExamsEnabled = isFeatureEnabled('term_exams');

  // Filter weekly tests
  const filteredTests = weeklyTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' || test.class === classFilter;
    return matchesSearch && matchesClass;
  });

  // Get unique classes from tests
  const uniqueClasses = [...new Set(weeklyTests.map(t => t.class).filter(Boolean))];

  const getTestStats = (test: typeof weeklyTests[0]) => {
    const results = testResults.filter(r => r.testId === test.id);
    const testStudents = students.filter(s => test.class === 'All' || s.class === test.class);
    const completed = results.length;
    const total = testStudents.length;
    const avgScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.marks, 0) / results.length)
      : 0;
    return { completed, total, avgScore };
  };

  if (loading || termExamLoading || featuresLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 sm:px-4 space-y-4 bg-[#f8f9fa]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Tests & Examinations</h1>
          <p className="text-sm text-muted-foreground">Manage weekly tests and term examinations</p>
        </div>
        <div className="flex gap-2">
          <CreateTestDialog onAddTest={addWeeklyTest} subjects={subjects} />
        </div>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="weekly" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Weekly Tests
          </TabsTrigger>
          <TabsTrigger value="term" className="gap-2" disabled={!isTermExamsEnabled}>
            <GraduationCap className="h-4 w-4" />
            Term Exams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map(cls => (
                  <SelectItem key={cls} value={cls!}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tests Grid */}
          {filteredTests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || classFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Create your first test to get started'}
                </p>
                <CreateTestDialog onAddTest={addWeeklyTest} subjects={subjects} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTests.map(test => {
                const stats = getTestStats(test);
                return (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{test.name}</CardTitle>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">{test.subject}</Badge>
                            {test.class && <Badge variant="outline" className="text-xs">{test.class}</Badge>}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Test</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{test.name}"? This will also delete all results.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteWeeklyTest(test.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-muted-foreground">
                          {new Date(test.date).toLocaleDateString()}
                        </span>
                        <span className="font-medium">Max: {test.maxMarks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Completed: </span>
                          <span className="font-semibold">{stats.completed}/{stats.total}</span>
                        </div>
                        <EnterMarksDialog
                          test={test}
                          students={students}
                          existingResults={testResults.filter(r => r.testId === test.id)}
                          divisions={divisions}
                          onAddResult={addTestResult}
                          onAddResultsBatch={addTestResultsBatch}
                          onAwardXP={awardXP}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="term" className="mt-4">
          {isTermExamsEnabled ? (
            <TermExamManager
              termExams={termExams}
              termExamSubjects={termExamSubjects}
              termExamResults={termExamResults}
              students={students}
              subjects={subjects}
              divisions={divisions}
              tuitionName={tuition?.name}
              onCreateExam={addTermExam}
              onDeleteExam={deleteTermExam}
              onAddResult={addTermExamResult}
              onBulkAddResults={bulkAddTermExamResults}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Term Exams Disabled</h3>
                <p className="text-muted-foreground">
                  Term exams feature is not enabled for your tuition center.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TestsPage;
