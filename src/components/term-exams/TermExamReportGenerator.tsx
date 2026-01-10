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
import jsPDF from "jspdf";

interface TermExamReportGeneratorProps {
  exam: TermExam;
  examSubjects: TermExamSubject[];
  results: TermExamResult[];
  students: Student[];
  subjects: Subject[];
  divisions: Division[];
  tuitionName?: string;
}

export function TermExamReportGenerator({
  exam,
  examSubjects,
  results,
  students,
  subjects,
  divisions,
  tuitionName = "Institution",
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

  const getGradeColor = (grade: string): { r: number; g: number; b: number } => {
    switch (grade) {
      case "A+": return { r: 22, g: 163, b: 74 };
      case "A": return { r: 34, g: 197, b: 94 };
      case "B+": return { r: 59, g: 130, b: 246 };
      case "B": return { r: 96, g: 165, b: 250 };
      case "C+": return { r: 234, g: 179, b: 8 };
      case "C": return { r: 251, g: 191, b: 36 };
      case "D": return { r: 249, g: 115, b: 22 };
      default: return { r: 239, g: 68, b: 68 };
    }
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
    
    // Calculate rank
    const stats = calculateStudentStats();
    const rank = stats.findIndex(s => s.student.id === selectedStudentId) + 1;

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Colors
    const primaryColor = { r: 59, g: 130, b: 246 }; // Blue
    const headerBg = { r: 30, g: 64, b: 175 }; // Dark blue
    const lightBg = { r: 241, g: 245, b: 249 }; // Light gray
    const borderColor = { r: 203, g: 213, b: 225 }; // Gray border

    // Header background
    doc.setFillColor(headerBg.r, headerBg.g, headerBg.b);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Institution name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(tuitionName.toUpperCase(), pageWidth / 2, 20, { align: "center" });

    // Report title
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("TERM EXAMINATION REPORT CARD", pageWidth / 2, 32, { align: "center" });

    // Academic info line
    doc.setFontSize(10);
    doc.text(`${exam.term} | Academic Year: ${exam.academicYear}`, pageWidth / 2, 43, { align: "center" });

    yPos = 60;

    // Student info box
    doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Student Details", margin + 5, yPos + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${student.name}`, margin + 5, yPos + 20);
    doc.text(`Class: ${exam.class}`, margin + 80, yPos + 20);
    if (student.division) {
      doc.text(`Division: ${student.division.name}`, margin + 130, yPos + 20);
    }
    doc.text(`Exam: ${exam.name}`, margin + 5, yPos + 30);

    yPos += 45;

    // Subject-wise marks table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerBg.r, headerBg.g, headerBg.b);
    doc.text("Subject-wise Performance", margin, yPos);
    
    yPos += 8;

    // Table header
    const tableStartY = yPos;
    const colWidths = [70, 35, 35, 30];
    const colX = [margin, margin + 70, margin + 105, margin + 140];
    
    doc.setFillColor(headerBg.r, headerBg.g, headerBg.b);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Subject", colX[0] + 3, yPos + 7);
    doc.text("Marks", colX[1] + 3, yPos + 7);
    doc.text("Max", colX[2] + 3, yPos + 7);
    doc.text("%", colX[3] + 3, yPos + 7);

    yPos += 10;

    // Table rows
    let totalMarks = 0;
    let totalMaxMarks = 0;
    let rowIndex = 0;

    examSubjects.forEach(es => {
      const subj = subjects.find(s => s.id === es.subjectId);
      const result = studentResults.find(r => r.subjectId === es.subjectId);
      const marks = result?.marks ?? 0;
      const pct = es.maxMarks > 0 ? ((marks / es.maxMarks) * 100) : 0;
      
      totalMarks += marks;
      totalMaxMarks += es.maxMarks;

      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
      }

      // Draw row borders
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 10);

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text(subj?.name || 'Subject', colX[0] + 3, yPos + 7);
      doc.text(String(marks), colX[1] + 3, yPos + 7);
      doc.text(String(es.maxMarks), colX[2] + 3, yPos + 7);
      
      // Color code percentage
      const pctColor = pct >= 40 ? { r: 22, g: 163, b: 74 } : { r: 239, g: 68, b: 68 };
      doc.setTextColor(pctColor.r, pctColor.g, pctColor.b);
      doc.text(`${pct.toFixed(1)}%`, colX[3] + 3, yPos + 7);

      yPos += 10;
      rowIndex++;
    });

    // Total row
    const overallPct = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100) : 0;
    const grade = getGrade(overallPct);
    
    doc.setFillColor(headerBg.r, headerBg.g, headerBg.b);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL", colX[0] + 3, yPos + 8);
    doc.text(String(totalMarks), colX[1] + 3, yPos + 8);
    doc.text(String(totalMaxMarks), colX[2] + 3, yPos + 8);
    doc.text(`${overallPct.toFixed(1)}%`, colX[3] + 3, yPos + 8);

    yPos += 22;

    // Results summary box
    doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, 'F');

    // Grade circle
    const gradeColor = getGradeColor(grade);
    doc.setFillColor(gradeColor.r, gradeColor.g, gradeColor.b);
    doc.circle(margin + 25, yPos + 22, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(grade, margin + 25, yPos + 28, { align: "center" });

    // Summary text
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text("Overall Percentage:", margin + 55, yPos + 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(`${overallPct.toFixed(1)}%`, margin + 55, yPos + 28);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Rank in Class:", margin + 110, yPos + 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(`${rank} of ${filteredStudents.length}`, margin + 110, yPos + 28);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Result: ${overallPct >= 33 ? "PASSED" : "FAILED"}`, margin + 55, yPos + 40);

    yPos += 55;

    // Grade scale
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Grade Scale: A+ (≥90%) | A (≥80%) | B+ (≥70%) | B (≥60%) | C+ (≥50%) | C (≥40%) | D (≥33%) | F (<33%)", 
      pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // Footer
    doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    yPos += 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })}`, margin, yPos);
    doc.text("This is a computer-generated report.", pageWidth - margin, yPos, { align: "right" });

    // Save PDF
    doc.save(`${student.name}_${exam.name}_report_card.pdf`);

    toast.success("Report card downloaded!");
    setIsOpen(false);
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
                  Individual Report Card (PDF)
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
              : "Will generate individual PDF report card with rank"
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
