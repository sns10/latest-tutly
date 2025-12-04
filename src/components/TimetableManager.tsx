import { useState } from 'react';
import { Timetable, Faculty, Subject, ClassName } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TimetableManagerProps {
  timetable: Timetable[];
  faculty: Faculty[];
  subjects: Subject[];
  onAddEntry: (
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomNumber?: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string
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
    roomNumber?: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLASSES: ClassName[] = ['8th', '9th', '10th', '11th'];

export function TimetableManager({
  timetable,
  faculty,
  subjects,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: TimetableManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Timetable | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassName>('8th');
  const [formData, setFormData] = useState({
    class: '8th' as ClassName,
    subjectId: '',
    facultyId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    type: 'regular' as 'regular' | 'special',
    roomNumber: '',
    specificDate: '',
    startDate: '',
    endDate: '',
  });

  const resetForm = () => {
    setFormData({
      class: selectedClass,
      subjectId: '',
      facultyId: '',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      type: 'regular',
      roomNumber: '',
      specificDate: '',
      startDate: '',
      endDate: '',
    });
    setEditingEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subjectId || !formData.facultyId) {
      toast.error('Please select subject and faculty');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time');
      return;
    }

    if (editingEntry) {
      await onUpdateEntry(
        editingEntry.id,
        formData.class,
        formData.subjectId,
        formData.facultyId,
        formData.dayOfWeek,
        formData.startTime,
        formData.endTime,
        formData.type,
        formData.roomNumber,
        formData.specificDate,
        formData.startDate,
        formData.endDate
      );
    } else {
      await onAddEntry(
        formData.class,
        formData.subjectId,
        formData.facultyId,
        formData.dayOfWeek,
        formData.startTime,
        formData.endTime,
        formData.type,
        formData.roomNumber,
        formData.specificDate,
        formData.startDate,
        formData.endDate
      );
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (entry: Timetable) => {
    setEditingEntry(entry);
    setFormData({
      class: entry.class,
      subjectId: entry.subjectId,
      facultyId: entry.facultyId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      type: entry.type,
      roomNumber: entry.roomNumber || '',
      specificDate: entry.specificDate || '',
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      await onDeleteEntry(id);
    }
  };

  const regularTimetable = timetable.filter((entry) => entry.class === selectedClass && entry.type === 'regular');
  const classSubjects = subjects.filter((s) => s.class === formData.class);
  
  // Get faculty that can teach the selected subject
  const availableFaculty = formData.subjectId
    ? faculty.filter((f) => f.subjects?.some((s) => s.id === formData.subjectId))
    : faculty;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Timetable Management</h1>
          <p className="text-muted-foreground text-sm">Manage class schedules and timings</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={formData.class}
                  onValueChange={(value) => setFormData({ ...formData, class: value as ClassName, subjectId: '', facultyId: '' })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {CLASSES.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="day">Day of Week *</Label>
                <Select
                  value={formData.dayOfWeek.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {DAYS.slice(1, 6).map((day, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value, facultyId: '' })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {subjects.filter(s => s.class === formData.class).map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="faculty">Faculty *</Label>
                <Select
                  value={formData.facultyId}
                  onValueChange={(value) => setFormData({ ...formData, facultyId: value })}
                  disabled={!formData.subjectId}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={formData.subjectId ? "Select faculty" : "Select subject first"} />
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

              <div>
                <Label htmlFor="roomNumber">Room Number (Optional)</Label>
                <Input
                  id="roomNumber"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  placeholder="e.g., Room 101"
                  className="bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingEntry ? 'Update' : 'Add'} Schedule
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Class Tabs - Pill shaped */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CLASSES.map((cls) => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selectedClass === cls
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-muted-foreground hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cls} Class
          </button>
        ))}
      </div>

      {/* Schedule List - Grouped by Day */}
      <div className="space-y-6">
        {DAYS.slice(1, 6).map((day, dayIndex) => {
          const dayEntries = regularTimetable
            .filter((entry) => entry.dayOfWeek === dayIndex + 1)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div key={day}>
              <h3 className="text-lg font-semibold text-foreground mb-3">{day}</h3>
              {dayEntries.length === 0 ? (
                <Card className="bg-white shadow-sm border-slate-200">
                  <CardContent className="py-6 text-center text-muted-foreground">
                    No classes scheduled
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {dayEntries.map((entry) => (
                    <Card key={entry.id} className="bg-white shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-blue-600">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium text-sm">
                                {entry.startTime} - {entry.endTime}
                              </span>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                              <p className="font-medium text-foreground">{entry.subject?.name || 'Unknown Subject'}</p>
                              <p className="text-sm text-muted-foreground">{entry.faculty?.name || 'Unknown Faculty'}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
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
                              onClick={() => handleDelete(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {entry.roomNumber && (
                          <p className="text-xs text-muted-foreground mt-2 pl-8">
                            📍 {entry.roomNumber}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
