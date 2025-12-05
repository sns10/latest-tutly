import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Timetable, Faculty, Subject, Room, ClassName, Division } from '@/types';

interface ScheduleClassDialogProps {
  timetable: Timetable[];
  faculty: Faculty[];
  subjects: Subject[];
  rooms: Room[];
  divisions: Division[];
  onScheduleClass: (
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomId?: string,
    roomNumber?: string,
    specificDate?: string,
    eventType?: string,
    notes?: string,
    divisionId?: string
  ) => Promise<void>;
  trigger?: React.ReactNode;
}

const EVENT_TYPES = [
  { value: 'class', label: 'Regular Class' },
  { value: 'exam_revision', label: 'Exam Revision' },
  { value: 'night_class', label: 'Night Class' },
  { value: 'special_class', label: 'Special Class' },
  { value: 'replacement', label: 'Holiday Replacement' },
  { value: 'extra_class', label: 'Extra Class' },
  { value: 'ptm', label: 'Parent-Teacher Meeting' },
  { value: 'custom', label: 'Custom Event' },
];

const CLASSES: ClassName[] = ['8th', '9th', '10th', '11th', '12th'];

export function ScheduleClassDialog({
  timetable,
  faculty,
  subjects,
  rooms,
  divisions,
  onScheduleClass,
  trigger,
}: ScheduleClassDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    class: '8th' as ClassName,
    divisionId: '',
    subjectId: '',
    facultyId: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    roomId: '',
    eventType: 'class',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      class: '8th',
      divisionId: '',
      subjectId: '',
      facultyId: '',
      date: '',
      startTime: '09:00',
      endTime: '10:00',
      roomId: '',
      eventType: 'class',
      notes: '',
    });
  };

  const classDivisions = useMemo(() => 
    divisions.filter(d => d.class === formData.class),
    [divisions, formData.class]
  );

  // Check room conflicts for the selected date and time
  const roomConflicts = useMemo(() => {
    if (!formData.date || !formData.startTime || !formData.endTime) return new Set<string>();

    const conflicts = new Set<string>();
    const selectedDate = formData.date;
    const selectedDay = new Date(selectedDate).getDay();

    timetable.forEach((entry) => {
      if (!entry.roomId) return;

      // Check for time overlap
      const hasTimeOverlap =
        (formData.startTime < entry.endTime && formData.endTime > entry.startTime);

      if (!hasTimeOverlap) return;

      // Check if it's a special class on the same date
      if (entry.type === 'special' && entry.specificDate === selectedDate) {
        conflicts.add(entry.roomId);
      }

      // Check if it's a regular class on the same day of week
      if (entry.type === 'regular' && entry.dayOfWeek === selectedDay) {
        // Check if there's no override for this date
        const hasOverride = timetable.some(
          (t) => t.type === 'special' && t.specificDate === selectedDate
        );
        if (!hasOverride) {
          conflicts.add(entry.roomId);
        }
      }
    });

    return conflicts;
  }, [formData.date, formData.startTime, formData.endTime, timetable]);

  // Get available rooms (not conflicting)
  const availableRooms = useMemo(() => {
    return rooms.filter((room) => !roomConflicts.has(room.id));
  }, [rooms, roomConflicts]);

  const classSubjects = subjects.filter((s) => s.class === formData.class);
  const availableFaculty = formData.subjectId
    ? faculty.filter((f) => f.subjects?.some((s) => s.id === formData.subjectId))
    : faculty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    if (!formData.subjectId) {
      toast.error('Please select a subject');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time');
      return;
    }

    // Warn if selected room has conflict
    if (formData.roomId && roomConflicts.has(formData.roomId)) {
      const confirmed = window.confirm(
        'This room is already booked at this time. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    const dayOfWeek = new Date(formData.date).getDay();

    await onScheduleClass(
      formData.class,
      formData.subjectId,
      formData.facultyId,
      dayOfWeek,
      formData.startTime,
      formData.endTime,
      'special',
      formData.roomId || undefined,
      undefined,
      formData.date,
      formData.eventType,
      formData.notes || undefined,
      formData.divisionId || undefined
    );

    resetForm();
    setIsOpen(false);
    toast.success('Class scheduled successfully');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Class
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule a Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Type */}
          <div>
            <Label>Event Type *</Label>
            <Select
              value={formData.eventType}
              onValueChange={(value) => setFormData({ ...formData, eventType: value })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="bg-white"
              required
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="bg-white"
                required
              />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="bg-white"
                required
              />
            </div>
          </div>

          {/* Class and Division */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Class *</Label>
              <Select
                value={formData.class}
                onValueChange={(value) => setFormData({ ...formData, class: value as ClassName, subjectId: '', facultyId: '', divisionId: '' })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Division</Label>
              <Select
                value={formData.divisionId || "all"}
                onValueChange={(value) => setFormData({ ...formData, divisionId: value === "all" ? "" : value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All divisions" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Divisions</SelectItem>
                  {classDivisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label>Subject *</Label>
            <Select
              value={formData.subjectId}
              onValueChange={(value) => setFormData({ ...formData, subjectId: value, facultyId: '' })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {classSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Faculty */}
          <div>
            <Label>Teacher (optional)</Label>
            <Select
              value={formData.facultyId}
              onValueChange={(value) => setFormData({ ...formData, facultyId: value })}
              disabled={!formData.subjectId}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={formData.subjectId ? "Select teacher" : "Select subject first"} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {availableFaculty.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room Selection with Availability */}
          <div>
            <Label>Room</Label>
            {formData.date && formData.startTime && formData.endTime && (
              <div className="mb-2 flex flex-wrap gap-1">
                {availableRooms.length > 0 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {availableRooms.length} rooms available
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    All rooms occupied
                  </Badge>
                )}
              </div>
            )}
            <Select
              value={formData.roomId || "none"}
              onValueChange={(value) => setFormData({ ...formData, roomId: value === "none" ? "" : value })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select room (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="none">No room assigned</SelectItem>
                {rooms.map((room) => {
                  const hasConflict = roomConflicts.has(room.id);
                  return (
                    <SelectItem key={room.id} value={room.id}>
                      <div className="flex items-center gap-2">
                        <span>{room.name}</span>
                        {room.capacity && <span className="text-muted-foreground text-xs">({room.capacity})</span>}
                        {hasConflict && (
                          <Badge variant="destructive" className="text-xs py-0">Occupied</Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              className="bg-white"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              Schedule Class
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}