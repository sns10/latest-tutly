import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { Pencil, Trash2, Clock, User, BookOpen, Share2, Plus } from 'lucide-react';
import { Timetable, Faculty, Subject, Room, ClassName, Division } from '@/types';

interface TomorrowScheduleProps {
  timetable: Timetable[];
  faculty: Faculty[];
  subjects: Subject[];
  rooms: Room[];
  divisions: Division[];
  onAddEntry: (
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
  onUpdateEntry: (
    id: string,
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
    startDate?: string,
    endDate?: string,
    divisionId?: string
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

const CLASS_TYPES = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Night Class', label: 'Night Class' },
  { value: 'Revision', label: 'Revision' },
  { value: 'Exam', label: 'Exam' },
  { value: 'Extra Class', label: 'Extra Class' },
];

export function TomorrowSchedule({
  timetable,
  faculty,
  subjects,
  rooms,
  divisions,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: TomorrowScheduleProps) {
  const [editingEntry, setEditingEntry] = useState<Timetable | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClassForAdd, setSelectedClassForAdd] = useState<ClassName | null>(null);
  const [addFormData, setAddFormData] = useState({
    subjectId: '',
    facultyId: '',
    startTime: '09:00',
    endTime: '10:00',
    roomId: '',
    eventType: 'Regular',
  });

  // Get tomorrow's date
  const tomorrow = useMemo(() => {
    return addDays(new Date(), 1);
  }, []);

  const tomorrowDateStr = useMemo(() => format(tomorrow, 'yyyy-MM-dd'), [tomorrow]);
  const tomorrowDayOfWeek = tomorrow.getDay();

  // Get tomorrow's classes
  const tomorrowClasses = useMemo(() => {
    // Get special classes for tomorrow
    const specialClasses = timetable.filter(
      (entry) => entry.type === 'special' && entry.specificDate === tomorrowDateStr
    );

    // Get regular classes for tomorrow's day of week (if not overridden by special class)
    const regularClasses = timetable.filter((entry) => {
      if (entry.type !== 'regular') return false;
      if (entry.dayOfWeek !== tomorrowDayOfWeek) return false;

      // Check if overridden by special class
      const isOverridden = specialClasses.some(
        (s) =>
          s.class === entry.class &&
          s.subjectId === entry.subjectId &&
          s.startTime < entry.endTime &&
          s.endTime > entry.startTime
      );

      return !isOverridden;
    });

    // Combine and enrich with subject/faculty data
    const allClasses = [...regularClasses, ...specialClasses].map((entry) => ({
      ...entry,
      subject: subjects.find((s) => s.id === entry.subjectId),
      faculty: faculty.find((f) => f.id === entry.facultyId),
      room: rooms.find((r) => r.id === entry.roomId),
    }));

    // Group by class
    const grouped: Record<ClassName, typeof allClasses> = {} as Record<ClassName, typeof allClasses>;
    
    allClasses.forEach((entry) => {
      if (!grouped[entry.class]) {
        grouped[entry.class] = [];
      }
      grouped[entry.class].push(entry);
    });

    // Sort each class's entries by time
    Object.keys(grouped).forEach((className) => {
      grouped[className as ClassName].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return grouped;
  }, [timetable, tomorrowDateStr, tomorrowDayOfWeek, subjects, faculty, rooms]);

  const classNames = Object.keys(tomorrowClasses).sort() as ClassName[];

  // Format time for WhatsApp (e.g., "4:00 PM")
  const formatTimeForWhatsApp = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Generate WhatsApp message for a class
  const generateWhatsAppMessage = (className: ClassName) => {
    const classes = tomorrowClasses[className];
    if (!classes || classes.length === 0) return '';

    const dateFormatted = format(tomorrow, 'dd/MM/yyyy');
    let message = `📅 *Tomorrow's Class Schedule*\n`;
    message += `📆 Date: ${dateFormatted}\n`;
    message += `🎓 *Class ${className}*\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;

    classes.forEach((entry, index) => {
      const startTimeStr = formatTimeForWhatsApp(entry.startTime);
      const endTimeStr = formatTimeForWhatsApp(entry.endTime);
      const subjectName = entry.subject?.name || 'Unknown Subject';
      
      message += `📚 *${subjectName}*\n`;
      message += `⏰ Time: ${startTimeStr} - ${endTimeStr}`;
      if (entry.faculty) {
        message += `\n👨‍🏫 Teacher: ${entry.faculty.name}`;
      }
      if (entry.room) {
        message += `\n🏫 Room: ${entry.room.name}`;
      }
      
      // Add spacing between classes
      if (index < classes.length - 1) {
        message += '\n\n';
      }
    });

    message += '\n\n━━━━━━━━━━━━━━━\n';
    message += '✅ Please be on time!';
    return message;
  };

  // Share to WhatsApp
  const shareToWhatsApp = (className: ClassName) => {
    const message = generateWhatsAppMessage(className);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handle edit - convert regular to special for tomorrow
  const handleEdit = (entry: Timetable) => {
    setEditingEntry(entry);
    setEditFormData({
      startTime: entry.startTime,
      endTime: entry.endTime,
      facultyId: entry.facultyId,
      eventType: entry.eventType || 'Regular',
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (entry: Timetable) => {
    if (window.confirm(`Delete ${entry.subject?.name || 'this class'} from tomorrow's schedule?`)) {
      await onDeleteEntry(entry.id);
    }
  };

  const [editFormData, setEditFormData] = useState({
    startTime: '',
    endTime: '',
    facultyId: '',
    eventType: 'Regular',
  });

  // Handle edit submit - create/update special class for tomorrow
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    if (editingEntry.type === 'regular') {
      // Create a special class override for tomorrow
      await onAddEntry(
        editingEntry.class,
        editingEntry.subjectId,
        editFormData.facultyId || editingEntry.facultyId,
        tomorrowDayOfWeek,
        editFormData.startTime,
        editFormData.endTime,
        'special',
        editingEntry.roomId,
        undefined,
        tomorrowDateStr,
        editFormData.eventType,
        undefined,
        editingEntry.divisionId
      );
    } else {
      // Update existing special class
      await onUpdateEntry(
        editingEntry.id,
        editingEntry.class,
        editingEntry.subjectId,
        editFormData.facultyId || editingEntry.facultyId,
        tomorrowDayOfWeek,
        editFormData.startTime,
        editFormData.endTime,
        'special',
        editingEntry.roomId,
        undefined,
        tomorrowDateStr,
        undefined,
        undefined,
        editingEntry.divisionId
      );
    }

    setIsEditDialogOpen(false);
    setEditingEntry(null);
    setEditFormData({ startTime: '', endTime: '', facultyId: '', eventType: 'Regular' });
  };

  // Handle add class for tomorrow
  const handleAddClass = (className: ClassName) => {
    setSelectedClassForAdd(className);
    setAddFormData({
      subjectId: '',
      facultyId: '',
      startTime: '09:00',
      endTime: '10:00',
      roomId: '',
      eventType: 'Regular',
    });
    setIsAddDialogOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForAdd || !addFormData.subjectId) return;

    await onAddEntry(
      selectedClassForAdd,
      addFormData.subjectId,
      addFormData.facultyId,
      tomorrowDayOfWeek,
      addFormData.startTime,
      addFormData.endTime,
      'special',
      addFormData.roomId || undefined,
      undefined,
      tomorrowDateStr,
      addFormData.eventType,
      undefined,
      undefined
    );

    setIsAddDialogOpen(false);
    setSelectedClassForAdd(null);
  };

  const classSubjects = useMemo(() => {
    if (!selectedClassForAdd) return [];
    return subjects.filter((s) => s.class === selectedClassForAdd);
  }, [subjects, selectedClassForAdd]);

  const availableFaculty = useMemo(() => {
    if (!addFormData.subjectId) return faculty;
    // Safely handle faculty filtering with optional chaining
    return faculty.filter((f) => f.subjects?.some((s) => s.id === addFormData.subjectId) ?? false);
  }, [faculty, addFormData.subjectId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Tomorrow's Schedule
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {format(tomorrow, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {classNames.length === 0 ? (
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">No classes scheduled for tomorrow</p>
            <p className="text-sm mt-1">Use "Schedule Class" to add classes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {classNames.map((className) => {
            const classes = tomorrowClasses[className];
            return (
              <Card key={className} className="bg-white shadow-sm border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      Class {className}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToWhatsApp(className)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share to WhatsApp
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {classes.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      No classes scheduled
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {classes.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-1 text-blue-600">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium text-sm">
                                  {entry.startTime} - {entry.endTime}
                                </span>
                              </div>
                              {entry.eventType && (
                                <Badge
                                  className={`text-xs ${
                                    entry.eventType === 'Night Class'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : entry.eventType === 'Revision'
                                      ? 'bg-purple-100 text-purple-700'
                                      : entry.eventType === 'Exam'
                                      ? 'bg-red-100 text-red-700'
                                      : entry.eventType === 'Extra Class'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {entry.eventType}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold text-foreground mb-1">
                              {entry.subject?.name || 'Unknown Subject'}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {entry.faculty && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{entry.faculty.name}</span>
                                </div>
                              )}
                              {entry.room && (
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  <span>{entry.room.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(entry)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleAddClass(className)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Class for Tomorrow
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Edit Tomorrow's Class</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={editingEntry.subject?.name || 'Unknown'}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={editFormData.startTime}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, startTime: e.target.value })
                    }
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={editFormData.endTime}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, endTime: e.target.value })
                    }
                    required
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <Label>Teacher</Label>
                <Select
                  value={editFormData.facultyId}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, facultyId: value })
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {faculty
                      .filter((f) =>
                        f.subjects?.some((s) => s.id === editingEntry.subjectId)
                      )
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <CreatableSelect
                  label="Class Type"
                  value={editFormData.eventType}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, eventType: value })
                  }
                  options={CLASS_TYPES}
                  placeholder="Select or type class type..."
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingEntry(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Class Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-white max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>Add Class for Tomorrow - Class {selectedClassForAdd}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <Label>Subject *</Label>
                <Select
                  value={addFormData.subjectId}
                  onValueChange={(value) =>
                    setAddFormData({ ...addFormData, subjectId: value, facultyId: '' })
                  }
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
              <div>
                <Label>Teacher</Label>
                <Select
                  value={addFormData.facultyId}
                  onValueChange={(value) =>
                    setAddFormData({ ...addFormData, facultyId: value })
                  }
                  disabled={!addFormData.subjectId}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue
                      placeholder={
                        addFormData.subjectId ? 'Select teacher' : 'Select subject first'
                      }
                    />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={addFormData.startTime}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, startTime: e.target.value })
                    }
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={addFormData.endTime}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, endTime: e.target.value })
                    }
                    required
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <Label>Room (optional)</Label>
                <Select
                  value={addFormData.roomId || 'none'}
                  onValueChange={(value) =>
                    setAddFormData({ ...addFormData, roomId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">No room assigned</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <CreatableSelect
                  label="Class Type"
                  value={addFormData.eventType}
                  onValueChange={(value) =>
                    setAddFormData({ ...addFormData, eventType: value })
                  }
                  options={CLASS_TYPES}
                  placeholder="Select or type class type..."
                />
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setSelectedClassForAdd(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

