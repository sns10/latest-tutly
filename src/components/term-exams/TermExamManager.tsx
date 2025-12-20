import { useState } from "react";
import { TermExam, TermExamSubject, TermExamResult, Student, Subject, Division } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Trash2, Calendar, BookOpen } from "lucide-react";
import { CreateTermExamDialog } from "./CreateTermExamDialog";
import { EnterTermExamMarksDialog } from "./EnterTermExamMarksDialog";
import { StudentWiseMarksEntry } from "./StudentWiseMarksEntry";
import { TermExamReportGenerator } from "./TermExamReportGenerator";

interface TermExamManagerProps {
  termExams: TermExam[];
  termExamSubjects: TermExamSubject[];
  termExamResults: TermExamResult[];
  students: Student[];
  subjects: Subject[];
  divisions: Division[];
  onCreateExam: (exam: {
    name: string;
    term: "1st Term" | "2nd Term" | "3rd Term";
    class: string;
    academicYear: string;
    startDate?: string;
    endDate?: string;
    subjects: { subjectId: string; maxMarks: number; examDate?: string }[];
  }) => Promise<string | null>;
  onDeleteExam: (examId: string) => void;
  onAddResult: (result: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }) => void;
  onBulkAddResults: (results: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }[]) => Promise<boolean>;
}

export function TermExamManager({
  termExams,
  termExamSubjects,
  termExamResults,
  students,
  subjects,
  divisions,
  onCreateExam,
  onDeleteExam,
  onAddResult,
  onBulkAddResults,
}: TermExamManagerProps) {
  const getExamStats = (exam: TermExam) => {
    const examSubjs = termExamSubjects.filter(es => es.termExamId === exam.id);
    const examResults = termExamResults.filter(r => r.termExamId === exam.id);
    const classStudents = students.filter(s => s.class === exam.class);
    
    const totalPossible = classStudents.length * examSubjs.length;
    const completed = examResults.length;
    
    // Calculate average percentage
    let totalPercentage = 0;
    let studentsWithResults = 0;
    
    classStudents.forEach(student => {
      const studentResults = examResults.filter(r => r.studentId === student.id);
      if (studentResults.length > 0) {
        let studentTotal = 0;
        let studentMax = 0;
        studentResults.forEach(r => {
          const subj = examSubjs.find(es => es.subjectId === r.subjectId);
          if (r.marks !== undefined && r.marks !== null && subj) {
            studentTotal += r.marks;
            studentMax += subj.maxMarks;
          }
        });
        if (studentMax > 0) {
          totalPercentage += (studentTotal / studentMax) * 100;
          studentsWithResults++;
        }
      }
    });

    const avgPercentage = studentsWithResults > 0 ? totalPercentage / studentsWithResults : 0;

    return {
      subjectsCount: examSubjs.length,
      studentsCount: classStudents.length,
      completed,
      totalPossible,
      avgPercentage: Math.round(avgPercentage),
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-primary">Term Examinations</h2>
          <p className="text-sm text-muted-foreground">Manage term exams with multiple subjects</p>
        </div>
        <CreateTermExamDialog subjects={subjects} onCreateExam={onCreateExam} />
      </div>

      {termExams.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No term exams created yet</h3>
            <p className="text-muted-foreground mb-4">Create your first term exam to get started</p>
            <CreateTermExamDialog subjects={subjects} onCreateExam={onCreateExam} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {termExams.map(exam => {
            const stats = getExamStats(exam);
            const examSubjs = termExamSubjects.filter(es => es.termExamId === exam.id);
            const examResults = termExamResults.filter(r => r.termExamId === exam.id);

            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{exam.name}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline">{exam.term}</Badge>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {exam.class} Grade
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {exam.academicYear}
                        </span>
                        {exam.startDate && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(exam.startDate).toLocaleDateString()}
                            {exam.endDate && ` - ${new Date(exam.endDate).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {stats.completed}/{stats.totalPossible}
                      </div>
                      <div className="text-sm text-muted-foreground">marks entered</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {examSubjs.map(es => {
                      const subj = subjects.find(s => s.id === es.subjectId);
                      return (
                        <Badge key={es.id} variant="outline" className="text-xs">
                          {subj?.name} ({es.maxMarks})
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-semibold">Students: </span>
                        <span>{stats.studentsCount}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">Avg Score: </span>
                        <span className={`font-bold ${stats.avgPercentage >= 80 ? 'text-green-500' : stats.avgPercentage >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {stats.avgPercentage}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <EnterTermExamMarksDialog
                        exam={exam}
                        examSubjects={examSubjs}
                        existingResults={examResults}
                        students={students}
                        divisions={divisions}
                        subjects={subjects}
                        onAddResult={onAddResult}
                        onBulkAddResults={onBulkAddResults}
                      />
                      <StudentWiseMarksEntry
                        exam={exam}
                        examSubjects={examSubjs}
                        existingResults={examResults}
                        students={students}
                        divisions={divisions}
                        subjects={subjects}
                        onBulkAddResults={onBulkAddResults}
                      />
                      <TermExamReportGenerator
                        exam={exam}
                        examSubjects={examSubjs}
                        results={examResults}
                        students={students}
                        subjects={subjects}
                        divisions={divisions}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Term Exam</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{exam.name}"? This will also delete all associated results. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteExam(exam.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
