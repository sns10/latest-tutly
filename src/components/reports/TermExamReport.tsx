import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Download, Printer, FileSpreadsheet, Trophy, BookOpen, AlertTriangle } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTermExamData } from '@/hooks/useTermExamData';
import { useTuitionInfo } from '@/hooks/useTuitionInfo';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface StudentTermResult {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  className: string;
  divisionName: string;
  subjectMarks: Record<string, number | null>;
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  grade: string;
  rank: number;
}

export function TermExamReport() {
  const { students, divisions, subjects } = useSupabaseData();
  const { termExams, termExamSubjects, termExamResults } = useTermExamData();
  const { tuition } = useTuitionInfo();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedExam, setSelectedExam] = useState<string>('');

  const classes = useMemo(() => 
    [...new Set(students.map(s => s.class))].sort(),
    [students]
  );

  const filteredExams = useMemo(() => 
    termExams.filter(e => selectedClass === 'all' || e.class === selectedClass),
    [termExams, selectedClass]
  );

  const selectedExamData = useMemo(() => 
    termExams.find(e => e.id === selectedExam),
    [termExams, selectedExam]
  );

  const examSubjects = useMemo(() => {
    if (!selectedExam) return [];
    return termExamSubjects.filter(s => s.termExamId === selectedExam);
  }, [termExamSubjects, selectedExam]);

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 35) return 'D';
    return 'F';
  };

  const results = useMemo(() => {
    if (!selectedExamData || examSubjects.length === 0) return [];

    const filteredStudents = students.filter(s => s.class === selectedExamData.class);

    const studentResults: StudentTermResult[] = filteredStudents.map(student => {
      const division = divisions.find(d => d.id === student.divisionId);
      const subjectMarks: Record<string, number | null> = {};
      let totalMarks = 0;
      let totalMaxMarks = 0;

      examSubjects.forEach(es => {
        const result = termExamResults.find(
          r => r.studentId === student.id && r.subjectId === es.subjectId && r.termExamId === selectedExam
        );
        const subject = subjects.find(s => s.id === es.subjectId);
        const subjectName = subject?.name || es.subjectId;
        
        subjectMarks[subjectName] = result?.marks ?? null;
        totalMaxMarks += es.maxMarks;
        if (result?.marks !== null && result?.marks !== undefined) {
          totalMarks += result.marks;
        }
      });

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        className: student.class,
        divisionName: division?.name || '-',
        subjectMarks,
        totalMarks,
        totalMaxMarks,
        percentage,
        grade: getGrade(percentage),
        rank: 0
      };
    });

    // Calculate ranks
    const rankedResults = [...studentResults].sort((a, b) => b.percentage - a.percentage);
    rankedResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    return rankedResults;
  }, [students, divisions, subjects, selectedExamData, examSubjects, termExamResults, selectedExam]);

  const summary = useMemo(() => {
    if (results.length === 0) return null;

    const passed = results.filter(r => r.percentage >= 35);
    const avgPercentage = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length);
    const highest = Math.max(...results.map(r => r.percentage));
    const lowest = Math.min(...results.map(r => r.percentage));

    return {
      total: results.length,
      passed: passed.length,
      failed: results.length - passed.length,
      average: avgPercentage,
      highest,
      lowest
    };
  }, [results]);

  const toppers = useMemo(() => results.slice(0, 3), [results]);

  const subjectNames = useMemo(() => {
    return examSubjects.map(es => {
      const subject = subjects.find(s => s.id === es.subjectId);
      return subject?.name || es.subjectId;
    });
  }, [examSubjects, subjects]);

  const exportToExcel = () => {
    if (!selectedExamData) return;

    const data = results.map((r) => {
      const row: Record<string, any> = {
        'Rank': r.rank,
        'Roll No': r.rollNo || '-',
        'Student Name': r.studentName,
        'Division': r.divisionName,
      };
      
      subjectNames.forEach(name => {
        row[name] = r.subjectMarks[name] ?? 'AB';
      });

      row['Total'] = `${r.totalMarks}/${r.totalMaxMarks}`;
      row['Percentage'] = `${r.percentage}%`;
      row['Grade'] = r.grade;

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Term Exam Results');
    XLSX.writeFile(wb, `${selectedExamData.name}_results.xlsx`);
    toast.success('Excel report downloaded!');
  };

  const exportToPDF = () => {
    if (!selectedExamData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedExamData.name} - Results</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 18px; }
            h2 { text-align: center; color: #666; margin-top: 0; font-size: 14px; }
            .info { text-align: center; margin-bottom: 15px; color: #666; }
            .summary { display: flex; justify-content: center; gap: 20px; margin-bottom: 15px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
            th { background-color: #f5f5f5; font-size: 10px; }
            td { font-size: 10px; }
            .pass { color: green; }
            .fail { color: red; }
            .topper { background-color: #fff9c4; }
            .grade { font-weight: bold; }
            @media print { 
              body { -webkit-print-color-adjust: exact; }
              @page { size: landscape; }
            }
          </style>
        </head>
        <body>
          <h1>${tuition?.name || 'Institution'}</h1>
          <h2>${selectedExamData.name}</h2>
          <div class="info">
            Class: ${selectedExamData.class} | Term: ${selectedExamData.term} | Academic Year: ${selectedExamData.academicYear}
          </div>
          ${summary ? `
            <div class="summary">
              <div class="summary-item"><div class="summary-value">${summary.total}</div><div>Total</div></div>
              <div class="summary-item"><div class="summary-value">${summary.passed}</div><div>Passed</div></div>
              <div class="summary-item"><div class="summary-value">${summary.failed}</div><div>Failed</div></div>
              <div class="summary-item"><div class="summary-value">${summary.average}%</div><div>Average</div></div>
            </div>
          ` : ''}
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roll</th>
                <th>Name</th>
                <th>Div</th>
                ${subjectNames.map(name => `<th>${name}</th>`).join('')}
                <th>Total</th>
                <th>%</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${results.map((r) => `
                <tr class="${r.rank <= 3 ? 'topper' : ''}">
                  <td>${r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}</td>
                  <td>${r.rollNo || '-'}</td>
                  <td style="text-align: left;">${r.studentName}</td>
                  <td>${r.divisionName}</td>
                  ${subjectNames.map(name => `<td>${r.subjectMarks[name] ?? 'AB'}</td>`).join('')}
                  <td>${r.totalMarks}/${r.totalMaxMarks}</td>
                  <td class="${r.percentage >= 35 ? 'pass' : 'fail'}">${r.percentage}%</td>
                  <td class="grade">${r.grade}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    toast.success('PDF report generated!');
  };

  const getGradeBadge = (grade: string) => {
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
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Term Exam</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedExam(''); }}>
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
              <Label className="text-xs">Term Exam</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {filteredExams.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} - {e.class} ({e.term} {e.academicYear})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedExamData && summary && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-xs text-muted-foreground">Students</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                <div className="text-xs text-green-700">Passed</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-xs text-red-700">Failed</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.average}%</div>
                <div className="text-xs text-blue-700">Average</div>
              </CardContent>
            </Card>
          </div>

          {/* Toppers */}
          {toppers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {toppers.map((r, i) => (
                    <div key={r.studentId} className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                      <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                      <div>
                        <div className="font-medium text-sm">{r.studentName}</div>
                        <div className="text-xs text-muted-foreground">{r.totalMarks}/{r.totalMaxMarks} ({r.percentage}%)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportToPDF} size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={() => exportToPDF()} size="sm" variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={exportToExcel} size="sm" variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          </div>

          {/* Results Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {selectedExamData.name} - {selectedExamData.class}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead className="w-12">Roll</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-12">Div</TableHead>
                      {subjectNames.map(name => (
                        <TableHead key={name} className="text-center w-16">{name}</TableHead>
                      ))}
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7 + subjectNames.length} className="text-center py-8 text-muted-foreground">
                          No results found for this exam
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.map((r) => (
                        <TableRow key={r.studentId} className={r.rank <= 3 ? 'bg-yellow-50' : ''}>
                          <TableCell>
                            {r.rank === 1 && '🥇'}
                            {r.rank === 2 && '🥈'}
                            {r.rank === 3 && '🥉'}
                            {r.rank > 3 && r.rank}
                          </TableCell>
                          <TableCell className="text-muted-foreground">#{r.rollNo || '-'}</TableCell>
                          <TableCell className="font-medium">{r.studentName}</TableCell>
                          <TableCell>{r.divisionName}</TableCell>
                          {subjectNames.map(name => (
                            <TableCell key={name} className="text-center">
                              {r.subjectMarks[name] !== null ? r.subjectMarks[name] : <span className="text-muted-foreground">AB</span>}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-medium">{r.totalMarks}/{r.totalMaxMarks}</TableCell>
                          <TableCell className={`text-center font-medium ${r.percentage >= 35 ? 'text-green-600' : 'text-red-600'}`}>
                            {r.percentage}%
                          </TableCell>
                          <TableCell>{getGradeBadge(r.grade)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedExam && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a term exam to view consolidated results</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
