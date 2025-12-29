import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Printer, FileSpreadsheet, ArrowUpDown, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTuitionInfo } from '@/hooks/useTuitionInfo';
import { useHistoricalAttendanceQuery } from '@/hooks/queries';
import { useUserTuition } from '@/hooks/useUserTuition';
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  className: string;
  divisionName: string;
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export function MonthlyAttendanceReport() {
  const { students, divisions } = useSupabaseData();
  const { tuition } = useTuitionInfo();
  const { tuitionId } = useUserTuition();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sortField, setSortField] = useState<'name' | 'percentage'>('percentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch attendance based on selected date range - this ensures historical data is loaded
  const { data: attendance = [] } = useHistoricalAttendanceQuery(tuitionId, startDate, endDate);

  const classes = useMemo(() => 
    [...new Set(students.map(s => s.class))].sort(),
    [students]
  );

  const filteredDivisions = useMemo(() => 
    divisions.filter(d => selectedClass === 'all' || d.class === selectedClass),
    [divisions, selectedClass]
  );

  const attendanceStats = useMemo(() => {
    const filteredStudents = students.filter(s => {
      if (selectedClass !== 'all' && s.class !== selectedClass) return false;
      if (selectedDivision !== 'all' && s.divisionId !== selectedDivision) return false;
      return true;
    });

    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    return filteredStudents.map(student => {
      const studentAttendance = attendance.filter(a => {
        if (a.studentId !== student.id) return false;
        const attendanceDate = parseISO(a.date);
        return isWithinInterval(attendanceDate, { start, end });
      });

      const totalClasses = studentAttendance.length;
      const present = studentAttendance.filter(a => a.status === 'present').length;
      const absent = studentAttendance.filter(a => a.status === 'absent').length;
      const late = studentAttendance.filter(a => a.status === 'late').length;
      const excused = studentAttendance.filter(a => a.status === 'excused').length;
      const percentage = totalClasses > 0 ? Math.round((present + late) / totalClasses * 100) : 0;

      const division = divisions.find(d => d.id === student.divisionId);

      return {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        className: student.class,
        divisionName: division?.name || '-',
        totalClasses,
        present,
        absent,
        late,
        excused,
        percentage
      } as StudentAttendanceStats;
    });
  }, [students, attendance, divisions, selectedClass, selectedDivision, startDate, endDate]);

  const sortedStats = useMemo(() => {
    return [...attendanceStats].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.studentName.localeCompare(b.studentName);
      } else {
        comparison = a.percentage - b.percentage;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [attendanceStats, sortField, sortDirection]);

  const distribution = useMemo(() => {
    return {
      low: attendanceStats.filter(s => s.percentage <= 30).length,
      medium: attendanceStats.filter(s => s.percentage > 30 && s.percentage <= 50).length,
      good: attendanceStats.filter(s => s.percentage > 50 && s.percentage <= 75).length,
      excellent: attendanceStats.filter(s => s.percentage > 75).length,
    };
  }, [attendanceStats]);

  const topPerformers = useMemo(() => 
    [...attendanceStats].sort((a, b) => b.percentage - a.percentage).slice(0, 5),
    [attendanceStats]
  );

  const bottomPerformers = useMemo(() => 
    [...attendanceStats].filter(s => s.totalClasses > 0).sort((a, b) => a.percentage - b.percentage).slice(0, 5),
    [attendanceStats]
  );

  const toggleSort = (field: 'name' | 'percentage') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPercentageBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge className="bg-green-500">{percentage}%</Badge>;
    if (percentage >= 75) return <Badge className="bg-blue-500">{percentage}%</Badge>;
    if (percentage >= 50) return <Badge className="bg-yellow-500">{percentage}%</Badge>;
    return <Badge variant="destructive">{percentage}%</Badge>;
  };

  const exportToExcel = () => {
    const data = sortedStats.map((s, index) => ({
      'S.No': index + 1,
      'Roll No': s.rollNo || '-',
      'Student Name': s.studentName,
      'Class': s.className,
      'Division': s.divisionName,
      'Total Classes': s.totalClasses,
      'Present': s.present,
      'Absent': s.absent,
      'Late': s.late,
      'Excused': s.excused,
      'Attendance %': s.percentage
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `attendance_report_${startDate}_to_${endDate}.xlsx`);
    toast.success('Excel report downloaded!');
  };

  const exportToPDF = () => {
    const printContent = document.getElementById('attendance-report-table');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Monthly Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; color: #666; margin-top: 0; }
            .info { text-align: center; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .percentage { font-weight: bold; }
            .high { color: green; }
            .medium { color: blue; }
            .low { color: orange; }
            .very-low { color: red; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>${tuition?.name || 'Institution'}</h1>
          <h2>Monthly Attendance Report</h2>
          <div class="info">
            Period: ${format(parseISO(startDate), 'dd MMM yyyy')} to ${format(parseISO(endDate), 'dd MMM yyyy')}<br/>
            ${selectedClass !== 'all' ? `Class: ${selectedClass}` : 'All Classes'}
            ${selectedDivision !== 'all' ? ` | Division: ${filteredDivisions.find(d => d.id === selectedDivision)?.name}` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Total</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Late</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${sortedStats.map((s, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${s.rollNo || '-'}</td>
                  <td>${s.studentName}</td>
                  <td>${s.className} ${s.divisionName !== '-' ? s.divisionName : ''}</td>
                  <td>${s.totalClasses}</td>
                  <td>${s.present}</td>
                  <td>${s.absent}</td>
                  <td>${s.late}</td>
                  <td class="percentage ${s.percentage >= 90 ? 'high' : s.percentage >= 75 ? 'medium' : s.percentage >= 50 ? 'low' : 'very-low'}">${s.percentage}%</td>
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

  const handlePrint = () => {
    exportToPDF();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
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
              <Label className="text-xs">Division</Label>
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {filteredDivisions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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

      {/* Distribution Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{distribution.low}</div>
            <div className="text-xs text-red-700">0-30%</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{distribution.medium}</div>
            <div className="text-xs text-yellow-700">31-50%</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{distribution.good}</div>
            <div className="text-xs text-blue-700">51-75%</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{distribution.excellent}</div>
            <div className="text-xs text-green-700">76-100%</div>
          </CardContent>
        </Card>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {topPerformers.map((s, i) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span className="truncate">{i + 1}. {s.studentName}</span>
                  {getPercentageBadge(s.percentage)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {bottomPerformers.map((s, i) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span className="truncate">{i + 1}. {s.studentName}</span>
                  {getPercentageBadge(s.percentage)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportToPDF} size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button onClick={exportToExcel} size="sm" variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Student Attendance ({sortedStats.length} students)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div id="attendance-report-table" className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead className="w-16">Roll</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="p-0 h-auto font-medium" onClick={() => toggleSort('name')}>
                      Name <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">A</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="p-0 h-auto font-medium" onClick={() => toggleSort('percentage')}>
                      % <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No attendance data found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStats.map((s, index) => (
                    <TableRow key={s.studentId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="text-muted-foreground">#{s.rollNo || '-'}</TableCell>
                      <TableCell className="font-medium">{s.studentName}</TableCell>
                      <TableCell>{s.className} {s.divisionName !== '-' && s.divisionName}</TableCell>
                      <TableCell className="text-center">{s.totalClasses}</TableCell>
                      <TableCell className="text-center text-green-600">{s.present}</TableCell>
                      <TableCell className="text-center text-red-600">{s.absent}</TableCell>
                      <TableCell className="text-center text-yellow-600">{s.late}</TableCell>
                      <TableCell>{getPercentageBadge(s.percentage)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
