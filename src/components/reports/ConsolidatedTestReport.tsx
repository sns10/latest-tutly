import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Download, Printer, FileSpreadsheet, Trophy, AlertTriangle } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTuitionInfo } from '@/hooks/useTuitionInfo';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface StudentTestStats {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  className: string;
  divisionName: string;
  marks: number | 'A';
  percentage: number;
  rank: number;
  passed: boolean;
}

export function ConsolidatedTestReport() {
  const { students, weeklyTests, testResults, divisions } = useSupabaseData();
  const { tuition } = useTuitionInfo();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTest, setSelectedTest] = useState<string>('');

  const classes = useMemo(() => 
    [...new Set(students.map(s => s.class))].sort(),
    [students]
  );

  const filteredTests = useMemo(() => 
    weeklyTests.filter(t => selectedClass === 'all' || t.class === selectedClass),
    [weeklyTests, selectedClass]
  );

  const selectedTestData = useMemo(() => 
    weeklyTests.find(t => t.id === selectedTest),
    [weeklyTests, selectedTest]
  );

  const testStats = useMemo(() => {
    if (!selectedTest || !selectedTestData) return [];

    const filteredStudents = students.filter(s => {
      if (selectedTestData.class && s.class !== selectedTestData.class) return false;
      return true;
    });

    const stats: StudentTestStats[] = filteredStudents.map(student => {
      const result = testResults.find(r => r.studentId === student.id && r.testId === selectedTest);
      const division = divisions.find(d => d.id === student.divisionId);
      const marks = result ? result.marks : 'A';
      const percentage = typeof marks === 'number' ? Math.round((marks / selectedTestData.maxMarks) * 100) : 0;
      const passingPercentage = 35;

      return {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        className: student.class,
        divisionName: division?.name || '-',
        marks,
        percentage,
        rank: 0,
        passed: typeof marks === 'number' && percentage >= passingPercentage
      };
    });

    // Calculate ranks for students who appeared
    const rankedStats = stats
      .filter(s => typeof s.marks === 'number')
      .sort((a, b) => (b.marks as number) - (a.marks as number));
    
    rankedStats.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    return stats.sort((a, b) => {
      if (a.rank === 0 && b.rank === 0) return a.studentName.localeCompare(b.studentName);
      if (a.rank === 0) return 1;
      if (b.rank === 0) return -1;
      return a.rank - b.rank;
    });
  }, [students, testResults, divisions, selectedTest, selectedTestData]);

  const summary = useMemo(() => {
    const appeared = testStats.filter(s => typeof s.marks === 'number');
    const passed = appeared.filter(s => s.passed);
    const total = appeared.reduce((sum, s) => sum + (s.marks as number), 0);
    const avg = appeared.length > 0 ? Math.round(total / appeared.length) : 0;
    const highest = appeared.length > 0 ? Math.max(...appeared.map(s => s.marks as number)) : 0;
    const lowest = appeared.length > 0 ? Math.min(...appeared.map(s => s.marks as number)) : 0;

    return {
      total: testStats.length,
      appeared: appeared.length,
      absent: testStats.filter(s => s.marks === 'A').length,
      passed: passed.length,
      failed: appeared.length - passed.length,
      average: avg,
      highest,
      lowest
    };
  }, [testStats]);

  const toppers = useMemo(() => 
    testStats.filter(s => typeof s.marks === 'number').slice(0, 3),
    [testStats]
  );

  const exportToExcel = () => {
    if (!selectedTestData) return;

    const data = testStats.map((s, index) => ({
      'Rank': s.rank || '-',
      'Roll No': s.rollNo || '-',
      'Student Name': s.studentName,
      'Class': s.className,
      'Division': s.divisionName,
      'Marks': s.marks,
      'Max Marks': selectedTestData.maxMarks,
      'Percentage': typeof s.marks === 'number' ? `${s.percentage}%` : 'AB',
      'Status': s.marks === 'A' ? 'Absent' : s.passed ? 'Pass' : 'Fail'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');
    XLSX.writeFile(wb, `${selectedTestData.name}_results.xlsx`);
    toast.success('Excel report downloaded!');
  };

  const exportToPDF = () => {
    if (!selectedTestData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedTestData.name} - Results</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; color: #666; margin-top: 0; }
            .info { text-align: center; margin-bottom: 20px; color: #666; }
            .summary { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .pass { color: green; font-weight: bold; }
            .fail { color: red; font-weight: bold; }
            .absent { color: gray; font-style: italic; }
            .topper { background-color: #fff9c4; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>${tuition?.name || 'Institution'}</h1>
          <h2>${selectedTestData.name}</h2>
          <div class="info">
            Subject: ${selectedTestData.subject} | Date: ${format(parseISO(selectedTestData.date), 'dd MMM yyyy')} | Max Marks: ${selectedTestData.maxMarks}
          </div>
          <div class="summary">
            <div class="summary-item"><div class="summary-value">${summary.appeared}/${summary.total}</div><div>Appeared</div></div>
            <div class="summary-item"><div class="summary-value">${summary.passed}</div><div>Passed</div></div>
            <div class="summary-item"><div class="summary-value">${summary.average}</div><div>Average</div></div>
            <div class="summary-item"><div class="summary-value">${summary.highest}</div><div>Highest</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Marks</th>
                <th>%</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${testStats.map((s, i) => `
                <tr class="${s.rank <= 3 && s.rank > 0 ? 'topper' : ''}">
                  <td>${s.rank || '-'}</td>
                  <td>${s.rollNo || '-'}</td>
                  <td>${s.studentName}</td>
                  <td>${s.className} ${s.divisionName !== '-' ? s.divisionName : ''}</td>
                  <td>${s.marks === 'A' ? 'Absent' : `${s.marks}/${selectedTestData.maxMarks}`}</td>
                  <td>${typeof s.marks === 'number' ? `${s.percentage}%` : '-'}</td>
                  <td class="${s.marks === 'A' ? 'absent' : s.passed ? 'pass' : 'fail'}">${s.marks === 'A' ? 'AB' : s.passed ? 'Pass' : 'Fail'}</td>
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedTest(''); }}>
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
              <Label className="text-xs">Test</Label>
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a test" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTests.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} - {t.subject} ({format(parseISO(t.date), 'dd MMM')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedTestData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{summary.appeared}/{summary.total}</div>
                <div className="text-xs text-muted-foreground">Appeared</div>
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
                <div className="text-2xl font-bold text-blue-600">{summary.average}</div>
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
                  {toppers.map((s, i) => (
                    <div key={s.studentId} className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                      <span className="text-lg">{['🥇', '🥈', '🥉'][i] || '🏅'}</span>
                      <div>
                        <div className="font-medium text-sm">{s.studentName}</div>
                        <div className="text-xs text-muted-foreground">{s.marks}/{selectedTestData.maxMarks} ({s.percentage}%)</div>
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
              <CardTitle className="text-sm">
                {selectedTestData.name} - {selectedTestData.subject}
                <span className="text-muted-foreground font-normal ml-2">
                  (Max: {selectedTestData.maxMarks})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead className="w-16">Roll</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Marks</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No students found for this test
                        </TableCell>
                      </TableRow>
                    ) : (
                      testStats.map((s) => (
                        <TableRow key={s.studentId} className={s.rank <= 3 && s.rank > 0 ? 'bg-yellow-50' : ''}>
                          <TableCell>
                            {s.rank === 1 && '🥇'}
                            {s.rank === 2 && '🥈'}
                            {s.rank === 3 && '🥉'}
                            {s.rank > 3 && s.rank}
                            {s.rank === 0 && '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">#{s.rollNo || '-'}</TableCell>
                          <TableCell className="font-medium">{s.studentName}</TableCell>
                          <TableCell>{s.className} {s.divisionName !== '-' && s.divisionName}</TableCell>
                          <TableCell className="text-center">
                            {s.marks === 'A' ? (
                              <span className="text-muted-foreground italic">Absent</span>
                            ) : (
                              <span>{s.marks}/{selectedTestData.maxMarks}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {typeof s.marks === 'number' ? `${s.percentage}%` : '-'}
                          </TableCell>
                          <TableCell>
                            {s.marks === 'A' ? (
                              <Badge variant="secondary">AB</Badge>
                            ) : s.passed ? (
                              <Badge className="bg-green-500">Pass</Badge>
                            ) : (
                              <Badge variant="destructive">Fail</Badge>
                            )}
                          </TableCell>
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

      {!selectedTest && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a test to view consolidated results</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
