import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Printer, User, CalendarDays, BookOpen, TrendingUp } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTermExamData } from '@/hooks/useTermExamData';
import { useTuitionInfo } from '@/hooks/useTuitionInfo';
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export function StudentReportCard() {
  const { students, weeklyTests, testResults, attendance, divisions, subjects } = useSupabaseData();
  const { termExams, termExamSubjects, termExamResults } = useTermExamData();
  const { tuition } = useTuitionInfo();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const classes = useMemo(() => 
    [...new Set(students.map(s => s.class))].sort(),
    [students]
  );

  const filteredStudents = useMemo(() => 
    students.filter(s => selectedClass === 'all' || s.class === selectedClass),
    [students, selectedClass]
  );

  const student = useMemo(() => 
    students.find(s => s.id === selectedStudent),
    [students, selectedStudent]
  );

  const division = useMemo(() => 
    student ? divisions.find(d => d.id === student.divisionId) : null,
    [student, divisions]
  );

  const attendanceStats = useMemo(() => {
    if (!student) return null;

    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    const studentAttendance = attendance.filter(a => {
      if (a.studentId !== student.id) return false;
      const attendanceDate = parseISO(a.date);
      return isWithinInterval(attendanceDate, { start, end });
    });

    const total = studentAttendance.length;
    const present = studentAttendance.filter(a => a.status === 'present').length;
    const absent = studentAttendance.filter(a => a.status === 'absent').length;
    const late = studentAttendance.filter(a => a.status === 'late').length;
    const excused = studentAttendance.filter(a => a.status === 'excused').length;
    const percentage = total > 0 ? Math.round((present + late) / total * 100) : 0;

    return { total, present, absent, late, excused, percentage };
  }, [student, attendance, startDate, endDate]);

  const testPerformance = useMemo(() => {
    if (!student) return [];

    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    const relevantTests = weeklyTests.filter(t => {
      if (t.class && t.class !== student.class) return false;
      const testDate = parseISO(t.date);
      return isWithinInterval(testDate, { start, end });
    });

    return relevantTests.map(test => {
      const result = testResults.find(r => r.studentId === student.id && r.testId === test.id);
      const marks = result?.marks ?? null;
      const percentage = marks !== null ? Math.round((marks / test.maxMarks) * 100) : null;
      const grade = percentage !== null ? getGrade(percentage) : '-';

      return {
        testId: test.id,
        testName: test.name,
        subject: test.subject,
        date: test.date,
        maxMarks: test.maxMarks,
        marks,
        percentage,
        grade
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student, weeklyTests, testResults, startDate, endDate]);

  const overallPerformance = useMemo(() => {
    const appeared = testPerformance.filter(t => t.marks !== null);
    if (appeared.length === 0) return null;

    const totalMarks = appeared.reduce((sum, t) => sum + (t.marks || 0), 0);
    const totalMaxMarks = appeared.reduce((sum, t) => sum + t.maxMarks, 0);
    const percentage = Math.round((totalMarks / totalMaxMarks) * 100);

    return {
      testsAppeared: appeared.length,
      totalTests: testPerformance.length,
      totalMarks,
      totalMaxMarks,
      percentage,
      grade: getGrade(percentage)
    };
  }, [testPerformance]);

  function getGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 35) return 'D';
    return 'F';
  }

  // Process term exam data for the selected student
  const termExamPerformance = useMemo(() => {
    if (!student) return [];

    const studentTermExams = termExams.filter(exam => exam.class === student.class);
    
    return studentTermExams.map(exam => {
      const examSubjects = termExamSubjects.filter(s => s.termExamId === exam.id);
      const results = termExamResults.filter(r => r.termExamId === exam.id && r.studentId === student.id);
      
      let totalMarks = 0;
      let totalMaxMarks = 0;
      
      const subjectResults = examSubjects.map(es => {
        const result = results.find(r => r.subjectId === es.subjectId);
        const subj = subjects.find(s => s.id === es.subjectId);
        if (result?.marks !== null && result?.marks !== undefined) {
          totalMarks += result.marks;
          totalMaxMarks += es.maxMarks;
        }
        return {
          subjectId: es.subjectId,
          subjectName: es.subject?.name || subj?.name || 'Unknown',
          marks: result?.marks,
          maxMarks: es.maxMarks,
          grade: result?.grade
        };
      });
      
      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;
      
      return {
        ...exam,
        subjectResults,
        totalMarks,
        totalMaxMarks,
        percentage,
        grade: getGrade(percentage)
      };
    });
  }, [student, termExams, termExamSubjects, termExamResults, subjects]);

  function getGradeBadge(grade: string) {
    const colors: Record<string, string> = {
      'A+': 'bg-green-600',
      'A': 'bg-green-500',
      'B+': 'bg-blue-500',
      'B': 'bg-blue-400',
      'C+': 'bg-yellow-500',
      'C': 'bg-yellow-400',
      'D': 'bg-orange-500',
      'F': 'bg-red-500'
    };
    return <Badge className={colors[grade] || 'bg-gray-400'}>{grade}</Badge>;
  }

  const generateReportCard = () => {
    if (!student || !attendanceStats) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Report Card - ${student.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { margin: 0 0 5px 0; }
            .header h2 { margin: 0; color: #666; font-weight: normal; }
            .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .info-item { display: flex; }
            .info-label { font-weight: bold; width: 100px; }
            .section { margin-bottom: 30px; }
            .section h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .stat-box { text-align: center; padding: 15px; border-radius: 8px; }
            .stat-box.green { background: #e8f5e9; }
            .stat-box.red { background: #ffebee; }
            .stat-box.blue { background: #e3f2fd; }
            .stat-box.yellow { background: #fff8e1; }
            .stat-value { font-size: 24px; font-weight: bold; }
            .stat-label { font-size: 12px; color: #666; }
            .grade { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
            .grade-A { background: #4caf50; color: white; }
            .grade-B { background: #2196f3; color: white; }
            .grade-C { background: #ff9800; color: white; }
            .grade-D { background: #ff5722; color: white; }
            .grade-F { background: #f44336; color: white; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-line { border-top: 1px solid #333; padding-top: 5px; width: 150px; text-align: center; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${tuition?.name || 'Institution'}</h1>
            <h2>Student Report Card</h2>
          </div>

          <div class="student-info">
            <div class="info-item"><span class="info-label">Name:</span> ${student.name}</div>
            <div class="info-item"><span class="info-label">Roll No:</span> ${student.rollNo || '-'}</div>
            <div class="info-item"><span class="info-label">Class:</span> ${student.class}${division ? ` - ${division.name}` : ''}</div>
            <div class="info-item"><span class="info-label">Period:</span> ${format(parseISO(startDate), 'dd MMM yyyy')} - ${format(parseISO(endDate), 'dd MMM yyyy')}</div>
          </div>

          <div class="section">
            <h3>📊 Attendance Summary</h3>
            <div class="stats-grid">
              <div class="stat-box blue"><div class="stat-value">${attendanceStats.total}</div><div class="stat-label">Total Classes</div></div>
              <div class="stat-box green"><div class="stat-value">${attendanceStats.present}</div><div class="stat-label">Present</div></div>
              <div class="stat-box red"><div class="stat-value">${attendanceStats.absent}</div><div class="stat-label">Absent</div></div>
              <div class="stat-box yellow"><div class="stat-value">${attendanceStats.percentage}%</div><div class="stat-label">Attendance %</div></div>
            </div>
          </div>

          <div class="section">
            <h3>📝 Academic Performance</h3>
            ${overallPerformance ? `
              <div class="stats-grid">
                <div class="stat-box blue"><div class="stat-value">${overallPerformance.testsAppeared}/${overallPerformance.totalTests}</div><div class="stat-label">Tests Appeared</div></div>
                <div class="stat-box green"><div class="stat-value">${overallPerformance.totalMarks}/${overallPerformance.totalMaxMarks}</div><div class="stat-label">Total Marks</div></div>
                <div class="stat-box yellow"><div class="stat-value">${overallPerformance.percentage}%</div><div class="stat-label">Percentage</div></div>
                <div class="stat-box ${overallPerformance.percentage >= 60 ? 'green' : overallPerformance.percentage >= 35 ? 'yellow' : 'red'}"><div class="stat-value">${overallPerformance.grade}</div><div class="stat-label">Grade</div></div>
              </div>
            ` : '<p>No test data available for this period.</p>'}
            
            ${testPerformance.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Marks</th>
                    <th>%</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  ${testPerformance.map(t => `
                    <tr>
                      <td>${t.testName}</td>
                      <td>${t.subject}</td>
                      <td>${format(parseISO(t.date), 'dd MMM yyyy')}</td>
                      <td>${t.marks !== null ? `${t.marks}/${t.maxMarks}` : 'Absent'}</td>
                      <td>${t.percentage !== null ? `${t.percentage}%` : '-'}</td>
                      <td><span class="grade grade-${t.grade[0]}">${t.grade}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>

          ${termExamPerformance.length > 0 ? `
            <div class="section">
              <h3>📚 Term Examination Results</h3>
              ${termExamPerformance.map(exam => `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div>
                      <strong>${exam.name}</strong>
                      <div style="font-size: 12px; color: #666;">${exam.term} • ${exam.academicYear}</div>
                    </div>
                    <div style="text-align: right;">
                      <strong>${exam.totalMarks}/${exam.totalMaxMarks}</strong>
                      <div><span class="grade grade-${exam.grade[0]}">${exam.percentage}% • ${exam.grade}</span></div>
                    </div>
                  </div>
                  <table style="font-size: 12px;">
                    <thead><tr><th>Subject</th><th>Marks</th><th>Max</th></tr></thead>
                    <tbody>
                      ${exam.subjectResults.map(sr => `
                        <tr>
                          <td>${sr.subjectName}</td>
                          <td>${sr.marks !== null && sr.marks !== undefined ? sr.marks : '-'}</td>
                          <td>${sr.maxMarks}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="footer">
            <div class="signature-line">Class Teacher</div>
            <div class="signature-line">Principal</div>
            <div class="signature-line">Parent/Guardian</div>
          </div>

          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
            Generated on ${format(new Date(), 'dd MMM yyyy')}
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    toast.success('Report card generated!');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent(''); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.rollNo ? `#${s.rollNo} ` : ''}{s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {student && attendanceStats && (
        <>
          {/* Student Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Name</div>
                  <div className="font-medium">{student.name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Roll No</div>
                  <div className="font-medium">#{student.rollNo || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Class</div>
                  <div className="font-medium">{student.class}{division ? ` - ${division.name}` : ''}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Total XP</div>
                  <div className="font-medium">{student.totalXp}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{attendanceStats.total}</div>
                  <div className="text-xs text-blue-700">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                  <div className="text-xs text-green-700">Present</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                  <div className="text-xs text-red-700">Absent</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
                  <div className="text-xs text-yellow-700">Late</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{attendanceStats.percentage}%</div>
                  <div className="text-xs text-purple-700">Attendance</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Performance */}
          {overallPerformance && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Overall Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{overallPerformance.testsAppeared}/{overallPerformance.totalTests}</div>
                    <div className="text-xs text-muted-foreground">Tests</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{overallPerformance.totalMarks}/{overallPerformance.totalMaxMarks}</div>
                    <div className="text-xs text-muted-foreground">Total Marks</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{overallPerformance.percentage}%</div>
                    <div className="text-xs text-muted-foreground">Percentage</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{getGradeBadge(overallPerformance.grade)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Grade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Test Performance ({testPerformance.length} tests)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Marks</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testPerformance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No tests found for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      testPerformance.map(t => (
                        <TableRow key={t.testId}>
                          <TableCell className="font-medium">{t.testName}</TableCell>
                          <TableCell>{t.subject}</TableCell>
                          <TableCell>{format(parseISO(t.date), 'dd MMM')}</TableCell>
                          <TableCell className="text-center">
                            {t.marks !== null ? `${t.marks}/${t.maxMarks}` : <span className="text-muted-foreground">AB</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {t.percentage !== null ? `${t.percentage}%` : '-'}
                          </TableCell>
                          <TableCell>{getGradeBadge(t.grade)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Term Exam Results */}
          {termExamPerformance.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Term Exam Results ({termExamPerformance.length} exams)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {termExamPerformance.map((exam) => (
                    <div key={exam.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{exam.name}</div>
                          <div className="text-xs text-muted-foreground">{exam.term} • {exam.academicYear}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{exam.totalMarks}/{exam.totalMaxMarks}</div>
                          {getGradeBadge(exam.grade)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t">
                        {exam.subjectResults.map((sr) => (
                          <div key={sr.subjectId} className="bg-muted/50 rounded px-2 py-1 text-sm">
                            <div className="text-xs text-muted-foreground">{sr.subjectName}</div>
                            <div className="font-medium">
                              {sr.marks !== null && sr.marks !== undefined ? `${sr.marks}/${sr.maxMarks}` : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateReportCard} size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Generate Report Card
            </Button>
            <Button onClick={generateReportCard} size="sm" variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </>
      )}

      {!selectedStudent && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a student to generate report card</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
