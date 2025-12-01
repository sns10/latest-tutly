import { useState } from 'react';
import { Faculty, Subject } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FacultyManagerProps {
  faculty: Faculty[];
  subjects: Subject[];
  onAddFaculty: (name: string, email: string, phone: string, subjectIds: string[]) => Promise<void>;
  onUpdateFaculty: (id: string, name: string, email: string, phone: string, subjectIds: string[]) => Promise<void>;
  onDeleteFaculty: (id: string) => Promise<void>;
}

export function FacultyManager({ faculty, subjects, onAddFaculty, onUpdateFaculty, onDeleteFaculty }: FacultyManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subjectIds: [] as string[],
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', subjectIds: [] });
    setEditingFaculty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter faculty name');
      return;
    }

    if (editingFaculty) {
      await onUpdateFaculty(
        editingFaculty.id,
        formData.name,
        formData.email,
        formData.phone,
        formData.subjectIds
      );
    } else {
      await onAddFaculty(formData.name, formData.email, formData.phone, formData.subjectIds);
    }

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (facultyMember: Faculty) => {
    setEditingFaculty(facultyMember);
    setFormData({
      name: facultyMember.name,
      email: facultyMember.email || '',
      phone: facultyMember.phone || '',
      subjectIds: facultyMember.subjects?.map(s => s.id) || [],
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this faculty member?')) {
      await onDeleteFaculty(id);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Faculty Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Faculty
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter faculty name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="faculty@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label className="mb-2 block">Subjects</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {subjects.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No subjects available</p>
                  ) : (
                    subjects.map((subject) => (
                      <div key={subject.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject.id}`}
                          checked={formData.subjectIds.includes(subject.id)}
                          onCheckedChange={() => toggleSubject(subject.id)}
                        />
                        <label
                          htmlFor={`subject-${subject.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {subject.name} ({subject.class})
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingFaculty ? 'Update' : 'Add'} Faculty
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {faculty.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No faculty members added yet. Click "Add Faculty" to get started.
            </CardContent>
          </Card>
        ) : (
          faculty.map((facultyMember) => (
            <Card key={facultyMember.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{facultyMember.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(facultyMember)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(facultyMember.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {facultyMember.email && (
                  <p className="text-sm text-muted-foreground mb-1">
                    📧 {facultyMember.email}
                  </p>
                )}
                {facultyMember.phone && (
                  <p className="text-sm text-muted-foreground mb-2">
                    📱 {facultyMember.phone}
                  </p>
                )}
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Subjects:</p>
                  {facultyMember.subjects && facultyMember.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {facultyMember.subjects.map((subject) => (
                        <span
                          key={subject.id}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                        >
                          {subject.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No subjects assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
