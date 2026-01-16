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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Student, ClassName, Division } from "@/types";
import { PlusCircle, ChevronDown, ChevronUp } from "lucide-react";

interface AddStudentDialogProps {
  divisions: Division[];
  onAddStudent: (student: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => void;
}

const classNames: ClassName[] = ["4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const genders = ["Male", "Female", "Other"];
const avatars = [
  'photo-1582562124811-c09040d0a901',
  'photo-1535268647677-300dbf3d78d1',
  'photo-1501286353178-1ec881214838',
  'photo-1441057206919-63d19fac2369',
];

export function AddStudentDialog({ divisions, onAddStudent }: AddStudentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);
  
  // Basic fields
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState<ClassName>("8th");
  const [divisionId, setDivisionId] = useState<string>("");
  const [rollNo, setRollNo] = useState("");
  
  // Additional fields
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [address, setAddress] = useState("");

  // Filter divisions based on selected class
  const availableDivisions = divisions.filter(d => d.class === studentClass);

  const handleSubmit = () => {
    if (name.trim() && studentClass) {
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
      onAddStudent({ 
        name: name.trim(), 
        class: studentClass,
        divisionId: divisionId === 'none' ? undefined : divisionId,
        rollNo: rollNo ? parseInt(rollNo, 10) : undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender as 'male' | 'female' | 'other' | undefined,
        email: email || undefined,
        phone: phone || undefined,
        parentName: parentName || undefined,
        parentPhone: parentPhone || undefined,
        address: address || undefined,
        avatar: `https://images.unsplash.com/${randomAvatar}?w=500&h=500&fit=crop`
      });
      resetForm();
      setIsOpen(false);
    }
  };

  const resetForm = () => {
    setName("");
    setStudentClass("8th");
    setDivisionId("");
    setRollNo("");
    setDateOfBirth("");
    setGender("");
    setEmail("");
    setPhone("");
    setParentName("");
    setParentPhone("");
    setAddress("");
    setShowAdditional(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-primary/10 border-primary text-primary hover:bg-primary/20 hover:text-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-background border-primary/50">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student's details to add them to your tuition center.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Basic Fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name *
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
              Class *
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
                <SelectValue placeholder="Auto-assign to Division A" />
              </SelectTrigger>
              <SelectContent>
                {availableDivisions.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    Division {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rollNo" className="text-right">
              Roll No
            </Label>
            <Input
              id="rollNo"
              type="number"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              className="col-span-3"
              placeholder="e.g. 1"
            />
          </div>

          {/* Additional Details Collapsible */}
          <Collapsible open={showAdditional} onOpenChange={setShowAdditional}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                Additional Details
                {showAdditional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dob" className="text-right">
                  DOB
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gender" className="text-right">
                  Gender
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map(g => (
                      <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="student@email.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="col-span-3"
                  placeholder="Student phone"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parentName" className="text-right">
                  Parent
                </Label>
                <Input
                  id="parentName"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="col-span-3"
                  placeholder="Parent/Guardian name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parentPhone" className="text-right">
                  Parent Ph
                </Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="col-span-3"
                  placeholder="Parent phone number"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="col-span-3"
                  placeholder="Full address"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">Add Student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
