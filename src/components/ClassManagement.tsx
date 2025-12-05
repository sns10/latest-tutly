import { useState } from 'react';
import { Division, ClassName, Subject, Faculty } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubjectFacultyManager } from './SubjectFacultyManager';
import { toast } from 'sonner';

interface ClassManagementProps {
  divisions: Division[];
  subjects: Subject[];
  faculty: Faculty[];
  onAddDivision: (classValue: ClassName, name: string) => void;
  onUpdateDivision: (id: string, name: string) => void;
  onDeleteDivision: (id: string) => void;
  onAddSubject: (name: string, className: ClassName) => void;
  onUpdateSubject: (id: string, name: string, className: ClassName) => void;
  onDeleteSubject: (id: string) => void;
  onAddFaculty: (name: string, email: string, phone: string, subjectIds: string[]) => void;
  onUpdateFaculty: (id: string, name: string, email: string, phone: string, subjectIds: string[]) => void;
  onDeleteFaculty: (id: string) => void;
}

const classNames: ClassName[] = ["8th", "9th", "10th", "11th", "12th"];

export function ClassManagement({ 
  divisions, 
  subjects, 
  faculty, 
  onAddDivision, 
  onUpdateDivision, 
  onDeleteDivision,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onAddFaculty,
  onUpdateFaculty,
  onDeleteFaculty
}: ClassManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassName>("8th");
  const [divisionName, setDivisionName] = useState("");
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("All");

  const handleAddDivision = () => {
    if (!divisionName.trim()) {
      toast.error('Please enter a division name');
      return;
    }

    // Check if division already exists
    const exists = divisions.some(d => d.class === selectedClass && d.name.toLowerCase() === divisionName.trim().toLowerCase());
    if (exists) {
      toast.error('This division already exists for this class');
      return;
    }

    onAddDivision(selectedClass, divisionName);
    setDivisionName("");
    setIsAddDialogOpen(false);
  };

  const handleEditDivision = () => {
    if (!editingDivision || !divisionName.trim()) {
      toast.error('Please enter a division name');
      return;
    }

    // Check if division already exists (excluding the current one)
    const exists = divisions.some(d => 
      d.id !== editingDivision.id && 
      d.class === editingDivision.class && 
      d.name.toLowerCase() === divisionName.trim().toLowerCase()
    );
    if (exists) {
      toast.error('This division name already exists for this class');
      return;
    }

    onUpdateDivision(editingDivision.id, divisionName);
    setEditingDivision(null);
    setDivisionName("");
    setIsEditDialogOpen(false);
  };

  const openEditDialog = (division: Division) => {
    setEditingDivision(division);
    setDivisionName(division.name);
    setIsEditDialogOpen(true);
  };

  const filteredDivisions = selectedClassFilter === "All" 
    ? divisions 
    : divisions.filter(d => d.class === selectedClassFilter);

  // Group divisions by class
  const divisionsByClass = classNames.reduce((acc, className) => {
    acc[className] = filteredDivisions.filter(d => d.class === className);
    return acc;
  }, {} as Record<ClassName, Division[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Academic Management
          </h2>
          <p className="text-muted-foreground">Manage classes, divisions, subjects, and faculty</p>
        </div>
      </div>

      <Tabs defaultValue="divisions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="divisions">Classes & Divisions</TabsTrigger>
          <TabsTrigger value="subjects">Subjects & Faculty</TabsTrigger>
        </TabsList>

        <TabsContent value="divisions" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Division
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Label>Filter by Class:</Label>
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Classes</SelectItem>
                {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {classNames.map(className => {
          const classDivisions = divisionsByClass[className];
          if (selectedClassFilter !== "All" && selectedClassFilter !== className) return null;
          
          return (
            <Card key={className} className="bg-white border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Class {className}</CardTitle>
              </CardHeader>
              <CardContent>
                {classDivisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No divisions added yet</p>
                ) : (
                  <div className="space-y-2">
                    {classDivisions.map(division => (
                      <div key={division.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">Division {division.name}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(division)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteDivision(division.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectFacultyManager
            subjects={subjects}
            faculty={faculty}
            onAddSubject={onAddSubject}
            onUpdateSubject={onUpdateSubject}
            onDeleteSubject={onDeleteSubject}
            onAddFaculty={onAddFaculty}
            onUpdateFaculty={onUpdateFaculty}
            onDeleteFaculty={onDeleteFaculty}
          />
        </TabsContent>
      </Tabs>

      {/* Add Division Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border-primary/50">
          <DialogHeader>
            <DialogTitle>Add New Division</DialogTitle>
            <DialogDescription>
              Create a new division for a class
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right">
                Class
              </Label>
              <Select onValueChange={(value: ClassName) => setSelectedClass(value)} defaultValue={selectedClass}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Division
              </Label>
              <Input
                id="name"
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. A, B, C"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddDivision} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Add Division
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Division Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border-primary/50">
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
            <DialogDescription>
              Update the division name
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Class
              </Label>
              <div className="col-span-3 text-sm font-medium">{editingDivision?.class}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Division
              </Label>
              <Input
                id="edit-name"
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. A, B, C"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditDivision} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Update Division
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
