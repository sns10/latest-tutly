import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, TestTube2 } from "lucide-react";
import { ClassName, Division, Subject, WeeklyTest } from "@/types";

interface CreateTestDialogProps {
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
  subjects: Subject[];
  divisions?: Division[];
}

interface FormErrors {
  name?: string;
  subject?: string;
  maxMarks?: string;
}

const initialFormState = {
  name: "",
  subject: "",
  maxMarks: "100",
  date: new Date(),
  className: "All" as ClassName,
  divisionId: "all",
};

export function CreateTestDialog({ onAddTest, subjects, divisions = [] }: CreateTestDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});

  const filteredSubjects = useMemo(() => {
    if (formData.className === "All") {
      const uniqueSubjects = new Map<string, Subject>();
      subjects.forEach((subject) => {
        if (!uniqueSubjects.has(subject.name)) {
          uniqueSubjects.set(subject.name, subject);
        }
      });
      return Array.from(uniqueSubjects.values());
    }

    return subjects.filter((subject) => subject.class === formData.className);
  }, [formData.className, subjects]);

  const availableDivisions = useMemo(() => {
    if (formData.className === "All") return [];
    return divisions.filter((division) => division.class === formData.className);
  }, [divisions, formData.className]);

  const resetForm = () => {
    setFormData({ ...initialFormState, date: new Date() });
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleClassChange = (value: ClassName) => {
    setFormData((prev) => ({
      ...prev,
      className: value,
      divisionId: "all",
      subject: "",
    }));
    setErrors((prev) => ({ ...prev, subject: undefined }));
  };

  const handleSubmit = () => {
    const trimmedName = formData.name.trim();
    const maxMarks = Number.parseInt(formData.maxMarks, 10);
    const nextErrors: FormErrors = {};

    if (trimmedName.length < 2) {
      nextErrors.name = "Test name must be at least 2 characters.";
    }

    if (!formData.subject) {
      nextErrors.subject = "Please select a subject.";
    }

    if (!Number.isInteger(maxMarks) || maxMarks <= 0) {
      nextErrors.maxMarks = "Max marks must be a positive number.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onAddTest({
      name: trimmedName,
      subject: formData.subject,
      maxMarks,
      date: formData.date.toISOString(),
      class: formData.className,
      divisionId:
        formData.className !== "All" && formData.divisionId !== "all"
          ? formData.divisionId
          : undefined,
    });

    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <TestTube2 className="mr-2 h-4 w-4" /> Create Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Weekly Test</DialogTitle>
          <DialogDescription>
            Add details for the new test. You can add student marks later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="weekly-test-name">Test Name</Label>
            <Input
              id="weekly-test-name"
              placeholder="e.g., Chapter 5 Quiz"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={formData.className} onValueChange={(value) => handleClassChange(value as ClassName)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Classes</SelectItem>
                <SelectItem value="4th">4th Grade</SelectItem>
                <SelectItem value="5th">5th Grade</SelectItem>
                <SelectItem value="6th">6th Grade</SelectItem>
                <SelectItem value="7th">7th Grade</SelectItem>
                <SelectItem value="8th">8th Grade</SelectItem>
                <SelectItem value="9th">9th Grade</SelectItem>
                <SelectItem value="10th">10th Grade</SelectItem>
                <SelectItem value="11th">11th Grade</SelectItem>
                <SelectItem value="12th">12th Grade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.className !== "All" && (
            <div className="space-y-2">
              <Label>Division</Label>
              <Select
                value={formData.divisionId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, divisionId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {availableDivisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      Division {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select
              value={formData.subject || undefined}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, subject: value }));
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {filteredSubjects.length === 0 ? (
                  <SelectItem value="no-subjects" disabled>
                    No subjects available for this class
                  </SelectItem>
                ) : (
                  filteredSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.name} {formData.className === "All" ? "" : `(${subject.class})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekly-test-max-marks">Max Marks</Label>
            <Input
              id="weekly-test-max-marks"
              type="number"
              min={1}
              step={1}
              value={formData.maxMarks}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, maxMarks: e.target.value }));
                if (errors.maxMarks) setErrors((prev) => ({ ...prev, maxMarks: undefined }));
              }}
            />
            {errors.maxMarks && <p className="text-sm text-destructive">{errors.maxMarks}</p>}
          </div>

          <div className="space-y-2">
            <Label>Test Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !formData.date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData((prev) => ({ ...prev, date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSubmit}>
            Create Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}