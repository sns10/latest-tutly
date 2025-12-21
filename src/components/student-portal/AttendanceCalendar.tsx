import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, getMonth, setMonth, setYear } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  student_id?: string | null;
  studentId?: string;
  subject_id?: string | null;
  subjectId?: string | null;
}

interface Subject {
  id: string;
  name: string;
}

interface AttendanceCalendarProps {
  attendance: AttendanceRecord[];
  subjects?: Subject[];
  showSubjectFilter?: boolean;
}

export function AttendanceCalendar({ attendance, subjects = [], showSubjectFilter = false }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Generate year options (last 3 years to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 3 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Filter attendance by selected subject
  const filteredAttendance = useMemo(() => {
    if (selectedSubject === 'all') return attendance;
    return attendance.filter(a => {
      const subjectId = a.subject_id || a.subjectId;
      return subjectId === selectedSubject;
    });
  }, [attendance, selectedSubject]);

  const attendanceByDate = useMemo(() => {
    const map: Record<string, string> = {};
    filteredAttendance.forEach(a => {
      // Use most recent status if multiple entries for same day
      if (!map[a.date]) {
        map[a.date] = a.status;
      }
    });
    return map;
  }, [filteredAttendance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      case 'late': return 'bg-yellow-500 text-white';
      case 'excused': return 'bg-blue-500 text-white';
      default: return '';
    }
  };

  const handleMonthChange = (monthIndex: string) => {
    setCurrentMonth(setMonth(currentMonth, parseInt(monthIndex)));
  };

  const handleYearChange = (year: string) => {
    setCurrentMonth(setYear(currentMonth, parseInt(year)));
  };

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  // Get unique subjects from attendance records
  const attendanceSubjects = useMemo(() => {
    const subjectIds = new Set<string>();
    attendance.forEach(a => {
      const subjectId = a.subject_id || a.subjectId;
      if (subjectId) subjectIds.add(subjectId);
    });
    return subjects.filter(s => subjectIds.has(s.id));
  }, [attendance, subjects]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg">Attendance Calendar</CardTitle>
          {showSubjectFilter && attendanceSubjects.length > 0 && (
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {attendanceSubjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between w-full max-w-[320px] mb-4 gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Select value={getMonth(currentMonth).toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[110px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={getYear(currentMonth).toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[80px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              disabled={isSameMonth(currentMonth, new Date())}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 w-full max-w-[280px]">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const status = attendanceByDate[dateStr];
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={dateStr}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-full
                    ${status ? getStatusColor(status) : ''}
                    ${isToday && !status ? 'ring-2 ring-primary' : ''}
                    ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/50' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Excused</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
