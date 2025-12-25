import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timetable, Room, ClassName } from '@/types';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';

interface TimelineViewProps {
  timetable: Timetable[];
  rooms: Room[];
  onEditEntry?: (entry: Timetable) => void;
  onDeleteEntry?: (id: string) => void;
}

const CLASSES: ClassName[] = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'All'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TimelineView({
  timetable,
  rooms,
  onEditEntry,
  onDeleteEntry,
}: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<ClassName>('All');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  // Get entries for a specific date
  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    // Get special classes for this date
    const specialClasses = timetable.filter(
      (entry) =>
        entry.type === 'special' &&
        entry.specificDate === dateStr &&
        (selectedClass === 'All' || entry.class === selectedClass)
    );

    // Get regular classes for this day of week (if not overridden by special class)
    const regularClasses = timetable.filter((entry) => {
      if (entry.type !== 'regular') return false;
      if (entry.dayOfWeek !== dayOfWeek) return false;
      if (selectedClass !== 'All' && entry.class !== selectedClass) return false;

      // Check if there's a special class override
      const hasOverride = specialClasses.some(
        (s) =>
          s.class === entry.class &&
          s.subjectId === entry.subjectId &&
          s.startTime < entry.endTime &&
          s.endTime > entry.startTime
      );

      return !hasOverride;
    });

    return [...regularClasses, ...specialClasses].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  };

  const todayEntries = useMemo(() => getEntriesForDate(currentDate), [currentDate, timetable, selectedClass]);

  const weekEntries = useMemo(() => {
    const entries: Record<number, Timetable[]> = {};
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      entries[i] = getEntriesForDate(day);
    }
    return entries;
  }, [weekStart, timetable, selectedClass]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'day' ? 1 : 7;
    setCurrentDate((prev) =>
      direction === 'next' ? addDays(prev, days) : addDays(prev, -days)
    );
  };

  const goToToday = () => setCurrentDate(new Date());

  const getRoomName = (roomId?: string) => {
    if (!roomId) return null;
    return rooms.find((r) => r.id === roomId)?.name;
  };

  const getEventTypeBadge = (entry: Timetable) => {
    const eventType = entry.eventType || 'Regular';
    
    // Map of known event types to colors (supports both old and new values)
    const labels: Record<string, { label: string; color: string }> = {
      // New class type values
      'Regular': { label: 'Regular', color: 'bg-slate-100 text-slate-700' },
      'Night Class': { label: 'Night Class', color: 'bg-indigo-100 text-indigo-700' },
      'Revision': { label: 'Revision', color: 'bg-purple-100 text-purple-700' },
      'Exam': { label: 'Exam', color: 'bg-red-100 text-red-700' },
      'Extra Class': { label: 'Extra Class', color: 'bg-green-100 text-green-700' },
      // Old event type values (for backward compatibility)
      'class': { label: 'Regular', color: 'bg-slate-100 text-slate-700' },
      'exam_revision': { label: 'Exam Revision', color: 'bg-purple-100 text-purple-700' },
      'night_class': { label: 'Night Class', color: 'bg-indigo-100 text-indigo-700' },
      'special_class': { label: 'Special', color: 'bg-blue-100 text-blue-700' },
      'replacement': { label: 'Replacement', color: 'bg-orange-100 text-orange-700' },
      'extra_class': { label: 'Extra', color: 'bg-green-100 text-green-700' },
      'ptm': { label: 'PTM', color: 'bg-pink-100 text-pink-700' },
      'custom': { label: 'Custom', color: 'bg-gray-100 text-gray-700' },
    };

    // Use the eventType as-is if it exists in labels, otherwise treat it as a custom value
    const badge = labels[eventType] || { label: eventType, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={`${badge.color} text-xs`}>{badge.label}</Badge>;
  };

  const EntryCard = ({ entry }: { entry: Timetable }) => (
    <Card className="bg-white shadow-sm border-slate-200 mb-2 hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                {entry.startTime} - {entry.endTime}
              </span>
              {getEventTypeBadge(entry)}
            </div>
            <h4 className="font-semibold text-foreground">{entry.subject?.name || 'Unknown Subject'}</h4>
            <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{entry.class} Class</span>
              </div>
              {entry.faculty && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{entry.faculty.name}</span>
                </div>
              )}
              {getRoomName(entry.roomId) && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{getRoomName(entry.roomId)}</span>
                </div>
              )}
              {entry.notes && (
                <p className="text-xs italic mt-1">{entry.notes}</p>
              )}
            </div>
          </div>
          {onEditEntry && onDeleteEntry && (
            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onEditEntry(entry)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm('Delete this schedule?')) {
                    onDeleteEntry(entry.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-medium ml-2">
            {viewMode === 'day'
              ? format(currentDate, 'EEEE, MMMM d, yyyy')
              : `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassName)}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {CLASSES.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls === 'All' ? 'All Classes' : `${cls} Class`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'day' ? 'bg-blue-600' : ''}
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'week' ? 'bg-blue-600' : ''}
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
          </div>
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentDate, 'EEEE')}
              {isSameDay(currentDate, new Date()) && (
                <Badge className="bg-blue-100 text-blue-700">Today</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEntries.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No classes scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {DAYS.map((day, index) => {
            const date = addDays(weekStart, index);
            const entries = weekEntries[index];
            const isToday = isSameDay(date, new Date());

            return (
              <Card
                key={day}
                className={`bg-white shadow-sm border-slate-200 ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{day}</span>
                    <span className={`text-sm ${isToday ? 'text-blue-600 font-bold' : 'text-muted-foreground'}`}>
                      {format(date, 'd')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <ScrollArea className="h-48">
                    {entries.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No classes</p>
                    ) : (
                      <div className="space-y-1">
                        {entries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-2 rounded text-xs ${
                              entry.type === 'special' ? 'bg-blue-50 border-l-2 border-blue-500' : 'bg-slate-50'
                            }`}
                          >
                            <div className="font-medium text-blue-600">
                              {entry.startTime} - {entry.endTime}
                            </div>
                            <div className="font-medium truncate">{entry.subject?.name}</div>
                            <div className="text-muted-foreground truncate">{entry.class}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
