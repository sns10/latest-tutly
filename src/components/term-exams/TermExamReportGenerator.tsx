import { useState } from "react";
import { TermExam, TermExamSubject, TermExamResult, Student, Subject, Division } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface TermExamReportGeneratorProps {
  exam: TermExam;
  examSubjects: TermExamSubject[];
  results: TermExamResult[];
  students: Student[];
  subjects: Subject[];
  divisions: Division[];
}

export function TermExamReportGenerator({
  exam,
  examSubjects,
  results,
  students,
  subjects,
  divisions,
}: TermExamReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<"individual" | "class">("class");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("");

  // Filter students by exam class
  const classStudents = students.filter(s => s.class === exam.class);
  const availableDivisions = divisions.filter(d => d.class === exam.class);

  // Filter by division if selected
  const filteredStudents = selectedDivision
    ? classStudents.filter(s => s.divisionId === selectedDivision)
    : classStudents;

  // Get exam results
  const examResults = results.filter(r => r.termExamId === exam.id);

  // Calculate student totals and ranks
  const calculateStudentStats = () => {
    return filteredStudents.map(student => {
      const studentResults = examResults.filter(r => r.studentId === student.id);
      let totalMarks = 0;
      let totalMaxMarks = 0;
      const subjectMarks: { [subjectId: string]: number | null } = {};

      examSubjects.forEach(es => {
        const result = studentResults.find(r => r.subjectId === es.subjectId);
        subjectMarks[es.subjectId] = result?.marks ?? null;
        if (result?.marks !== undefined && result?.marks !== null) {
          totalMarks += result.marks;
        }
        totalMaxMarks += es.maxMarks;
      });

      const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

      return {
        student,
        subjectMarks,
        totalMarks,
        totalMaxMarks,
        percentage,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  };

  const generateClassResultSheet = () => {
    const stats = calculateStudentStats();
    
    // Create CSV content
    let csv = "Rank,Student Name,Division";
    examSubjects.forEach(es => {
      const subj = subjects.find(s => s.id === es.subjectId);
      csv += `,${subj?.name || 'Subject'} (${es.maxMarks})`;
    });
    csv += ",Total,Percentage,Grade\n";

    stats.forEach((stat, index) => {
      const rank = index + 1;
      const grade = getGrade(stat.percentage);
      const divisionName = stat.student.division?.name || '-';
      
      csv += `${rank},"${stat.student.name}",${divisionName}`;
      examSubjects.forEach(es => {
        csv += `,${stat.subjectMarks[es.subjectId] ?? '-'}`;
      });
      csv += `,${stat.totalMarks}/${stat.totalMaxMarks},${stat.percentage.toFixed(1)}%,${grade}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exam.name}_class_result_sheet.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Class result sheet downloaded!");
    setIsOpen(false);
  };

  const generateIndividualReportCard = () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }

    const student = classStudents.find(s => s.id === selectedStudentId);
    if (!student) return;

    const studentResults = examResults.filter(r => r.studentId === selectedStudentId);
    let totalMarks = 0;
    let totalMaxMarks = 0;

    // Calculate rank
    const stats = calculateStudentStats();
    const studentStat = stats.find(s => s.student.id === selectedStudentId);
    const rank = stats.findIndex(s => s.student.id === selectedStudentId) + 1;

    // Create report card content
    let report = "═══════════════════════════════════════════════\n";
    report += "              TERM EXAMINATION REPORT CARD\n";
    report += "═══════════════════════════════════════════════\n\n";
    report += `Exam: ${exam.name}\n`;
    report += `Term: ${exam.term}\n`;
    report += `Academic Year: ${exam.academicYear}\n`;
    report += `Class: ${exam.class}\n\n`;
    report += "───────────────────────────────────────────────\n";
    report += `Student Name: ${student.name}\n`;
    if (student.division) {
      report += `Division: ${student.division.name}\n`;
    }
    report += "───────────────────────────────────────────────\n\n";
    report += "SUBJECT-WISE MARKS:\n\n";
    report += "Subject                  Marks    Max    %\n";
    report += "───────────────────────────────────────────────\n";

    examSubjects.forEach(es => {
      const subj = subjects.find(s => s.id === es.subjectId);
      const result = studentResults.find(r => r.subjectId === es.subjectId);
      const marks = result?.marks ?? 0;
      const pct = es.maxMarks > 0 ? ((marks / es.maxMarks) * 100).toFixed(1) : "0.0";
      
      totalMarks += marks;
      totalMaxMarks += es.maxMarks;
      
      const subjectName = (subj?.name || 'Subject').padEnd(24);
      report += `${subjectName}${String(marks).padStart(5)}   ${String(es.maxMarks).padStart(5)}   ${pct.padStart(5)}%\n`;
    });

    const overallPct = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100) : 0;
    const grade = getGrade(overallPct);

    report += "───────────────────────────────────────────────\n";
    report += `${"TOTAL".padEnd(24)}${String(totalMarks).padStart(5)}   ${String(totalMaxMarks).padStart(5)}   ${overallPct.toFixed(1).padStart(5)}%\n`;
    report += "═══════════════════════════════════════════════\n\n";
    report += `Overall Percentage: ${overallPct.toFixed(1)}%\n`;
    report += `Grade: ${grade}\n`;
    report += `Rank in Class: ${rank} of ${filteredStudents.length}\n`;
    report += "\n═══════════════════════════════════════════════\n";

    // Download report
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${student.name}_${exam.name}_report_card.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Report card downloaded!");
    setIsOpen(false);
  };

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C+";
    if (percentage >= 40) return "C";
    if (percentage >= 33) return "D";
    return "F";
  };

  const handleGenerate = () => {
    if (reportType === "class") {
      generateClassResultSheet();
    } else {
      generateIndividualReportCard();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Report - {exam.name}</DialogTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{exam.term}</Badge>
            <Badge variant="outline">{exam.class} Grade</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Report Type</Label>
            <RadioGroup
              value={reportType}
              onValueChange={(v) => setReportType(v as "individual" | "class")}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="class" id="class" />
                <Label htmlFor="class" className="font-normal">
                  Class Result Sheet (All students)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="font-normal">
                  Individual Report Card
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Division Filter */}
          {availableDivisions.length > 0 && (
            <div>
              <Label>Division</Label>
              <Select value={selectedDivision || "all"} onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All divisions</SelectItem>
                  {availableDivisions.map(div => (
                    <SelectItem key={div.id} value={div.id}>
                      Division {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {reportType === "individual" && (
            <div>
              <Label>Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} {student.division ? `(Div ${student.division.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {reportType === "class" 
              ? `Will generate result sheet for ${filteredStudents.length} students`
              : "Will generate individual report card with rank"
            }
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
