import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  student_id: string | null;
}

interface AttendanceCalendarProps {
  attendance: AttendanceRecord[];
}

export function AttendanceCalendar({ attendance }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const attendanceByDate = useMemo(() => {
    const map: Record<string, string> = {};
    attendance.forEach(a => {
      // Use most recent status if multiple entries for same day
      if (!map[a.date]) {
        map[a.date] = a.status;
      }
    });
    return map;
  }, [attendance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      case 'late': return 'bg-yellow-500 text-white';
      case 'excused': return 'bg-blue-500 text-white';
      default: return '';
    }
  };

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Attendance Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Month Navigation */}
          <div className="flex items-center justify-between w-full max-w-[280px] mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
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
