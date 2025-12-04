import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timetable, Room } from '@/types';
import { Pencil, Trash2, Clock, MapPin, User, BookOpen, Calendar, CalendarX } from 'lucide-react';
import { format, parseISO, isPast, isToday, isFuture } from 'date-fns';

interface SpecialClassesListProps {
  timetable: Timetable[];
  rooms: Room[];
  onEditEntry: (entry: Timetable) => void;
  onDeleteEntry: (id: string) => Promise<void>;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  exam_revision: { label: 'Exam Revision', color: 'bg-purple-100 text-purple-700' },
  night_class: { label: 'Night Class', color: 'bg-indigo-100 text-indigo-700' },
  special_class: { label: 'Special', color: 'bg-blue-100 text-blue-700' },
  replacement: { label: 'Replacement', color: 'bg-orange-100 text-orange-700' },
  extra_class: { label: 'Extra', color: 'bg-green-100 text-green-700' },
  ptm: { label: 'PTM', color: 'bg-pink-100 text-pink-700' },
  custom: { label: 'Custom', color: 'bg-gray-100 text-gray-700' },
  class: { label: 'Class', color: 'bg-slate-100 text-slate-700' },
};

export function SpecialClassesList({
  timetable,
  rooms,
  onEditEntry,
  onDeleteEntry,
}: SpecialClassesListProps) {
  const specialClasses = useMemo(() => {
    return timetable
      .filter((entry) => entry.type === 'special' && entry.specificDate)
      .sort((a, b) => {
        if (!a.specificDate || !b.specificDate) return 0;
        return a.specificDate.localeCompare(b.specificDate) || a.startTime.localeCompare(b.startTime);
      });
  }, [timetable]);

  const upcomingClasses = specialClasses.filter(
    (entry) => entry.specificDate && (isFuture(parseISO(entry.specificDate)) || isToday(parseISO(entry.specificDate)))
  );

  const pastClasses = specialClasses.filter(
    (entry) => entry.specificDate && isPast(parseISO(entry.specificDate)) && !isToday(parseISO(entry.specificDate))
  );

  const getRoomName = (roomId?: string) => {
    if (!roomId) return null;
    return rooms.find((r) => r.id === roomId)?.name;
  };

  const getEventTypeBadge = (eventType?: string) => {
    const type = eventType || 'class';
    const badge = EVENT_TYPE_LABELS[type] || EVENT_TYPE_LABELS.custom;
    return <Badge className={`${badge.color} text-xs`}>{badge.label}</Badge>;
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this scheduled class?')) {
      await onDeleteEntry(id);
    }
  };

  const ClassCard = ({ entry }: { entry: Timetable }) => {
    const date = entry.specificDate ? parseISO(entry.specificDate) : null;
    const isEntryToday = date && isToday(date);
    const isEntryPast = date && isPast(date) && !isEntryToday;
    const roomName = getRoomName(entry.roomId);

    return (
      <Card className={`bg-white shadow-sm border-slate-200 hover:shadow-md transition-shadow ${isEntryPast ? 'opacity-60' : ''}`}>
        <CardContent className="py-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {date && (
                  <Badge variant="outline" className={isEntryToday ? 'border-blue-500 text-blue-600' : ''}>
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(date, 'EEE, MMM d, yyyy')}
                  </Badge>
                )}
                {getEventTypeBadge(entry.eventType)}
                {isEntryToday && (
                  <Badge className="bg-blue-100 text-blue-700">Today</Badge>
                )}
              </div>

              <h4 className="font-semibold text-foreground mb-2">{entry.subject?.name || 'Unknown Subject'}</h4>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{entry.startTime} - {entry.endTime}</span>
                </div>
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
                {roomName && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{roomName}</span>
                  </div>
                )}
              </div>

              {entry.notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">{entry.notes}</p>
              )}
            </div>

            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEditEntry(entry)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Classes */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Scheduled Classes
          <Badge variant="secondary">{upcomingClasses.length}</Badge>
        </h3>
        {upcomingClasses.length === 0 ? (
          <Card className="bg-white shadow-sm border-slate-200">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No upcoming classes scheduled</p>
              <p className="text-sm">Use "Schedule Class" to add special classes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingClasses.map((entry) => (
              <ClassCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Past Classes */}
      {pastClasses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Past Classes
            <Badge variant="secondary">{pastClasses.length}</Badge>
          </h3>
          <div className="space-y-3">
            {pastClasses.slice(0, 5).map((entry) => (
              <ClassCard key={entry.id} entry={entry} />
            ))}
            {pastClasses.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                + {pastClasses.length - 5} more past classes
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
