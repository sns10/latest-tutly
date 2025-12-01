import { useState } from 'react';
import { Timetable, Faculty, Subject, ClassName } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      class: '8th',
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
    if (window.confirm('Are you sure you want to delete this timetable entry?')) {
      await onDeleteEntry(id);
    }
  };

  const regularTimetable = timetable.filter((entry) => entry.class === selectedClass && entry.type === 'regular');
  const specialTimetable = timetable.filter((entry) => entry.class === selectedClass && entry.type === 'special');
  const classSubjects = subjects.filter((s) => s.class === selectedClass);
  
  // Get faculty that can teach the selected subject
  const availableFaculty = formData.subjectId
    ? faculty.filter((f) => f.subjects?.some((s) => s.id === formData.subjectId))
    : faculty;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Timetable Management</h2>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'regular' | 'special') => 
                    setFormData({ 
                      ...formData, 
                      type: value,
                      specificDate: '',
                      startDate: '',
                      endDate: ''
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular (Weekly)</SelectItem>
                    <SelectItem value="special">Special (Specific Date/Week)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'regular' && (
                <div>
                  <Label htmlFor="day">Day *</Label>
                  <Select
                    value={formData.dayOfWeek.toString()}
                    onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'special' && (
                <>
                  <div>
                    <Label htmlFor="specificDate">Specific Date (One-time class)</Label>
                    <Input
                      id="specificDate"
                      type="date"
                      value={formData.specificDate}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        specificDate: e.target.value,
                        startDate: '',
                        endDate: ''
                      })}
                    />
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">OR</div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date (Date Range)</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          startDate: e.target.value,
                          specificDate: ''
                        })}
                        disabled={!!formData.specificDate}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          endDate: e.target.value,
                          specificDate: ''
                        })}
                        disabled={!!formData.specificDate}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="day">Day of Week *</Label>
                    <Select
                      value={formData.dayOfWeek.toString()}
                      onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value, facultyId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger>
                    <SelectValue placeholder={formData.subjectId ? "Select faculty" : "Select subject first"} />
                  </SelectTrigger>
                  <SelectContent>
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
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
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
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  placeholder="e.g., Room 101"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
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

      <div className="flex gap-2 flex-wrap">
        {CLASSES.map((cls) => (
          <Button
            key={cls}
            variant={selectedClass === cls ? 'default' : 'outline'}
            onClick={() => setSelectedClass(cls)}
          >
            {cls}
          </Button>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Regular Weekly Timetable</h3>
          <div className="grid gap-4">
            {DAYS.slice(1, 6).map((day, dayIndex) => {
              const dayEntries = regularTimetable.filter((entry) => entry.dayOfWeek === dayIndex + 1);

              return (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="text-lg">{day}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dayEntries.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No classes scheduled</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEntries
                          .sort((a, b) => a.startTime.localeCompare(b.startTime))
                          .map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {entry.startTime} - {entry.endTime}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">{entry.subject?.name}</p>
                                <p className="text-sm text-muted-foreground">{entry.faculty?.name}</p>
                                {entry.roomNumber && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    📍 {entry.roomNumber}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {specialTimetable.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Special Classes</h3>
            <div className="grid gap-4">
              {specialTimetable
                .sort((a, b) => {
                  const dateA = a.specificDate || a.startDate || '';
                  const dateB = b.specificDate || b.startDate || '';
                  return dateA.localeCompare(dateB);
                })
                .map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {entry.specificDate ? (
                              <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                                {new Date(entry.specificDate).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            ) : (
                              <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                                {new Date(entry.startDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(entry.endDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {DAYS[entry.dayOfWeek]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {entry.startTime} - {entry.endTime}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{entry.subject?.name}</p>
                          <p className="text-sm text-muted-foreground">{entry.faculty?.name}</p>
                          {entry.roomNumber && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {entry.roomNumber}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
