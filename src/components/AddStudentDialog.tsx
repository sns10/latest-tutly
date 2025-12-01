
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Student, ClassName, Division } from "@/types";
import { PlusCircle } from "lucide-react";

interface AddStudentDialogProps {
  divisions: Division[];
  onAddStudent: (student: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => void;
}

const classNames: ClassName[] = ["8th", "9th", "10th", "11th"];
const avatars = [
  'photo-1582562124811-c09040d0a901',
  'photo-1535268647677-300dbf3d78d1',
  'photo-1501286353178-1ec881214838',
  'photo-1441057206919-63d19fac2369',
];

export function AddStudentDialog({ divisions, onAddStudent }: AddStudentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState<ClassName>("8th");
  const [divisionId, setDivisionId] = useState<string>("");

  // Filter divisions based on selected class
  const availableDivisions = divisions.filter(d => d.class === studentClass);

  const handleSubmit = () => {
    if (name.trim() && studentClass) {
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
      onAddStudent({ 
        name: name.trim(), 
        class: studentClass,
        divisionId: divisionId || undefined,
        avatar: `https://images.unsplash.com/${randomAvatar}?w=500&h=500&fit=crop`
      });
      setName("");
      setStudentClass("8th");
      setDivisionId("");
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-primary/10 border-primary text-primary hover:bg-primary/20 hover:text-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-primary/50">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student's details to add them to the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Ada Lovelace"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="class" className="text-right">
              Class
            </Label>
            <Select 
              onValueChange={(value: ClassName) => {
                setStudentClass(value);
                setDivisionId(""); // Reset division when class changes
              }} 
              defaultValue={studentClass}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="division" className="text-right">
              Division
            </Label>
            <Select 
              value={divisionId}
              onValueChange={setDivisionId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a division (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Division</SelectItem>
                {availableDivisions.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    Division {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">Add Student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
