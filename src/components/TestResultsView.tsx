
import { useState } from "react";
import { WeeklyTest, StudentTestResult, Student } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ReportExporter } from "./ReportExporter";

interface TestResultsViewProps {
  tests: WeeklyTest[];
  testResults: StudentTestResult[];
  students: Student[];
}

export function TestResultsView({ tests, testResults, students }: TestResultsViewProps) {
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");

  const classes = ["All", ...new Set(students.map(s => s.class))];
  const subjects = ["All", ...new Set(tests.map(t => t.subject))];

  const filteredStudents = students.filter(student => 
    selectedClass === "All" || student.class === selectedClass
  );

  const filteredTests = tests.filter(test =>
    selectedSubject === "All" || test.subject === selectedSubject
  );

  const getStudentResults = (studentId: string) => {
    return filteredTests.map(test => {
      const result = testResults.find(r => r.testId === test.id && r.studentId === studentId);
      return {
        test,
        result,
        percentage: result ? (result.marks / test.maxMarks) * 100 : null
      };
    });
  };

  const getSubjectAverage = (subject: string) => {
    const subjectTests = tests.filter(t => t.subject === subject);
    const subjectResults = testResults.filter(r => 
      subjectTests.some(t => t.id === r.testId)
    );
    
    if (subjectResults.length === 0) return 0;
    
    const totalPercentage = subjectResults.reduce((sum, result) => {
      const test = subjectTests.find(t => t.id === result.testId);
      if (!test) return sum;
      return sum + (result.marks / test.maxMarks) * 100;
    }, 0);
    
    return Math.round(totalPercentage / subjectResults.length);
  };

  const exportResults = () => {
    const csvContent = [
      ['Student Name', 'Class', ...filteredTests.map(t => `${t.name} (${t.subject})`)],
      ...filteredStudents.map(student => {
        const results = getStudentResults(student.id);
        return [
          student.name,
          student.class,
          ...results.map(r => r.percentage ? `${Math.round(r.percentage)}%` : 'N/A')
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Results exported successfully!");
  };

  if (tests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No test data available</h3>
          <p className="text-muted-foreground">Create and complete tests to view detailed reports</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h3 className="text-base sm:text-xl font-semibold">Test Results & Reports</h3>
        </div>
        <Button onClick={exportResults} className="flex items-center gap-2 text-xs sm:text-sm" size="sm">
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(cls => (
              <SelectItem key={cls} value={cls}>{cls === "All" ? "All Classes" : `${cls} Grade`}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject === "All" ? "All Subjects" : subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject Averages */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Subject Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {subjects.filter(s => s !== "All").map(subject => (
              <div key={subject} className="text-center p-3 sm:p-4 bg-secondary/20 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-primary">
                  {getSubjectAverage(subject)}%
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-semibold truncate">{subject}</div>
                <div className="text-xs text-muted-foreground">Average</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student Results Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Individual Student Results</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {filteredStudents.map(student => {
              const results = getStudentResults(student.id);
              const completedTests = results.filter(r => r.result).length;
              const averageScore = results.length > 0 
                ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.filter(r => r.percentage).length
                : 0;

              return (
                <div key={student.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm sm:text-base truncate">{student.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{student.class} Grade</div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                      <div className="text-base sm:text-lg font-bold text-primary">
                        {Math.round(averageScore || 0)}%
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {completedTests}/{filteredTests.length} tests
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {results.map(({ test, result, percentage }) => (
                      <div key={test.id} className="flex justify-between items-center p-2 bg-secondary/10 rounded min-w-0">
                        <div className="text-xs sm:text-sm min-w-0 flex-1 mr-2">
                          <div className="font-medium truncate">{test.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{test.subject}</div>
                        </div>
                        <div className="text-right shrink-0">
                          {result ? (
                            <>
                              <Badge variant={percentage! >= 80 ? "default" : percentage! >= 60 ? "secondary" : "destructive"} className="text-xs">
                                {Math.round(percentage!)}%
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {result.marks}/{test.maxMarks}
                              </div>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-xs">Not taken</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
