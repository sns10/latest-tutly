import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Brain, TrendingUp, Target, Lightbulb, Loader2 } from 'lucide-react';
import type { Student, StudentTestResult, WeeklyTest } from '@/types';

interface StudentAnalysisProps {
  students: Student[];
  testResults: StudentTestResult[];
  tests: WeeklyTest[];
}

export default function StudentAnalysis({ students, testResults, tests }: StudentAnalysisProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const analyzeStudent = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    setLoading(true);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) throw new Error('Student not found');

      // Get student's test results with test details
      const studentResults = testResults
        .filter(r => r.studentId === selectedStudentId)
        .map(result => {
          const test = tests.find(t => t.id === result.testId);
          return {
            testName: test?.name || 'Unknown Test',
            subject: test?.subject || 'Unknown',
            marks: result.marks,
            maxMarks: test?.maxMarks || 100
          };
        })
        .slice(-10); // Last 10 tests

      if (studentResults.length === 0) {
        toast.error('No test results found for this student');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-student', {
        body: {
          studentData: {
            name: student.name,
            class: student.class,
            totalXp: student.totalXp,
            team: student.team
          },
          testResults: studentResults
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        if (error.message?.includes('402')) {
          throw new Error('AI analysis credits exhausted. Please add more credits.');
        }
        throw error;
      }

      setAnalysis(data.analysis);
      toast.success('Analysis complete!');
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze student performance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Performance Analysis
          </CardTitle>
          <CardDescription>
            Get AI-powered insights into student performance, weak areas, and personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} - {student.class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={analyzeStudent} disabled={loading || !selectedStudentId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Analyze Performance
                </>
              )}
            </Button>
          </div>

          {analysis && (
            <div className="mt-6 space-y-4">
              <div className="prose prose-sm max-w-none">
                <div className="bg-muted/50 rounded-lg p-6 whitespace-pre-wrap">
                  {analysis}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Strong Areas</p>
                        <p className="text-lg font-semibold">Identified</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Focus Areas</p>
                        <p className="text-lg font-semibold">Highlighted</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Lightbulb className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Action Plan</p>
                        <p className="text-lg font-semibold">Generated</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
