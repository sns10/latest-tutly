import { useState } from 'react';
import { Subject, Faculty, ClassName } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubjectFacultyManagerProps {
  subjects: Subject[];
  faculty: Faculty[];
  onAddSubject: (name: string, className: ClassName) => void;
  onAddFaculty: (name: string, email: string, phone: string, subjectIds: string[]) => void;
  onUpdateFaculty: (id: string, name: string, email: string, phone: string, subjectIds: string[]) => void;
  onDeleteFaculty: (id: string) => void;
}

const classNames: ClassName[] = ["8th", "9th", "10th", "11th", "12th"];

export function SubjectFacultyManager({
  subjects,
  faculty,
  onAddSubject,
  onAddFaculty,
  onUpdateFaculty,
  onDeleteFaculty
}: SubjectFacultyManagerProps) {
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [isEditFacultyOpen, setIsEditFacultyOpen] = useState(false);
  
  const [subjectName, setSubjectName] = useState("");
  const [subjectClass, setSubjectClass] = useState<ClassName>("8th");
  
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [facultyPhone, setFacultyPhone] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

  const handleAddSubject = () => {
    if (!subjectName.trim()) {
      toast.error('Please enter a subject name');
      return;
    }
    onAddSubject(subjectName, subjectClass);
    setSubjectName("");
    setIsAddSubjectOpen(false);
  };

  const handleAddFaculty = () => {
    if (!facultyName.trim()) {
      toast.error('Please enter faculty name');
      return;
    }
    onAddFaculty(facultyName, facultyEmail, facultyPhone, selectedSubjects);
    setFacultyName("");
    setFacultyEmail("");
    setFacultyPhone("");
    setSelectedSubjects([]);
    setIsAddFacultyOpen(false);
  };

  const handleEditFaculty = () => {
    if (!editingFaculty || !facultyName.trim()) {
      toast.error('Please enter faculty name');
      return;
    }
    onUpdateFaculty(editingFaculty.id, facultyName, facultyEmail, facultyPhone, selectedSubjects);
    setEditingFaculty(null);
    setFacultyName("");
    setFacultyEmail("");
    setFacultyPhone("");
    setSelectedSubjects([]);
    setIsEditFacultyOpen(false);
  };

  const openEditDialog = (fac: Faculty) => {
    setEditingFaculty(fac);
    setFacultyName(fac.name);
    setFacultyEmail(fac.email || "");
    setFacultyPhone(fac.phone || "");
    setSelectedSubjects(fac.subjects?.map(s => s.id) || []);
    setIsEditFacultyOpen(true);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Subjects Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subjects
            </CardTitle>
            <Button onClick={() => setIsAddSubjectOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {classNames.map(className => {
              const classSubjects = subjects.filter(s => s.class === className);
              return (
                <div key={className}>
                  <h4 className="font-semibold text-sm mb-2">Class {className}</h4>
                  <div className="flex flex-wrap gap-2">
                    {classSubjects.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No subjects</span>
                    ) : (
                      classSubjects.map(subject => (
                        <Badge key={subject.id} variant="secondary">
                          {subject.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Faculty Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faculty
            </CardTitle>
            <Button onClick={() => setIsAddFacultyOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Faculty
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {faculty.length === 0 ? (
            <p className="text-sm text-muted-foreground">No faculty members added yet</p>
          ) : (
            <div className="space-y-3">
              {faculty.map(fac => (
                <div key={fac.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{fac.name}</h4>
                      {fac.email && <p className="text-xs text-muted-foreground">{fac.email}</p>}
                      {fac.phone && <p className="text-xs text-muted-foreground">{fac.phone}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(fac)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteFaculty(fac.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {fac.subjects?.map(subject => (
                      <Badge key={subject.id} variant="outline" className="text-xs">
                        {subject.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subject Dialog */}
      <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>Create a new subject for a class</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject-class" className="text-right">Class</Label>
              <Select onValueChange={(value: ClassName) => setSubjectClass(value)} defaultValue={subjectClass}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject-name" className="text-right">Subject</Label>
              <Input
                id="subject-name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Mathematics"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddSubject}>Add Subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Faculty Dialog */}
      <Dialog open={isAddFacultyOpen} onOpenChange={setIsAddFacultyOpen}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Faculty</DialogTitle>
            <DialogDescription>Create a new faculty member and assign subjects</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="faculty-name">Name *</Label>
                <Input
                  id="faculty-name"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="Enter faculty name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty-email">Email</Label>
                <Input
                  id="faculty-email"
                  type="email"
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty-phone">Phone</Label>
                <Input
                  id="faculty-phone"
                  value={facultyPhone}
                  onChange={(e) => setFacultyPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Assign Subjects</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/30">
                  {subjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No subjects available. Add subjects first.</p>
                  ) : (
                    subjects.map(subject => (
                      <div key={subject.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`subject-${subject.id}`}
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={() => toggleSubject(subject.id)}
                          className="rounded"
                        />
                        <Label htmlFor={`subject-${subject.id}`} className="cursor-pointer text-sm">
                          {subject.name} ({subject.class})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button onClick={handleAddFaculty}>Add Faculty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Faculty Dialog */}
      <Dialog open={isEditFacultyOpen} onOpenChange={setIsEditFacultyOpen}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
            <DialogDescription>Update faculty member details</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-faculty-name">Name *</Label>
                <Input
                  id="edit-faculty-name"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="Enter faculty name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-faculty-email">Email</Label>
                <Input
                  id="edit-faculty-email"
                  type="email"
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-faculty-phone">Phone</Label>
                <Input
                  id="edit-faculty-phone"
                  value={facultyPhone}
                  onChange={(e) => setFacultyPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Assign Subjects</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/30">
                  {subjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No subjects available. Add subjects first.</p>
                  ) : (
                    subjects.map(subject => (
                      <div key={subject.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit-subject-${subject.id}`}
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={() => toggleSubject(subject.id)}
                          className="rounded"
                        />
                        <Label htmlFor={`edit-subject-${subject.id}`} className="cursor-pointer text-sm">
                          {subject.name} ({subject.class})
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button onClick={handleEditFaculty}>Update Faculty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
