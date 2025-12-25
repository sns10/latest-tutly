import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Subject, ClassName } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  term: z.enum(["1st Term", "2nd Term", "3rd Term"]),
  class: z.string().min(1, "Class is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

interface CreateTermExamDialogProps {
  subjects: Subject[];
  onCreateExam: (exam: {
    name: string;
    term: "1st Term" | "2nd Term" | "3rd Term";
    class: ClassName;
    academicYear: string;
    startDate?: string;
    endDate?: string;
    subjects: { subjectId: string; maxMarks: number; examDate?: string }[];
  }) => Promise<string | null>;
}

export function CreateTermExamDialog({ subjects, onCreateExam }: CreateTermExamDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<{ [subjectId: string]: { maxMarks: number; examDate: string } }>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      term: "1st Term",
      class: "",
      academicYear: new Date().getFullYear().toString(),
      startDate: "",
      endDate: "",
    },
  });

  const selectedClass = form.watch("class");

  // Filter subjects by selected class
  const availableSubjects = useMemo(() => {
    if (!selectedClass || selectedClass === "All") return [];
    return subjects.filter(s => s.class === selectedClass);
  }, [subjects, selectedClass]);

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => {
      if (prev[subjectId]) {
        const { [subjectId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [subjectId]: { maxMarks: 100, examDate: "" } };
    });
  };

  const updateSubjectMaxMarks = (subjectId: string, maxMarks: number) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], maxMarks },
    }));
  };

  const updateSubjectExamDate = (subjectId: string, examDate: string) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], examDate },
    }));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const subjectsList = Object.entries(selectedSubjects).map(([subjectId, data]) => ({
      subjectId,
      maxMarks: data.maxMarks,
      examDate: data.examDate || undefined,
    }));

    if (subjectsList.length === 0) {
      return;
    }

    const result = await onCreateExam({
      name: values.name,
      term: values.term,
      class: values.class as ClassName,
      academicYear: values.academicYear,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      subjects: subjectsList,
    });

    if (result) {
      form.reset();
      setSelectedSubjects({});
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Term Exam
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{ 
          // iOS keyboard fix - ensure dialog stays visible when keyboard opens
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        }}
        onOpenAutoFocus={(e) => {
          // Prevent auto focus to avoid keyboard triggering on dialog open
          e.preventDefault();
        }}
      >
        <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
          <DialogTitle>Create Term Exam</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1st Term Examination 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1st Term">1st Term</SelectItem>
                        <SelectItem value="2nd Term">2nd Term</SelectItem>
                        <SelectItem value="3rd Term">3rd Term</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="4th">4th</SelectItem>
                        <SelectItem value="5th">5th</SelectItem>
                        <SelectItem value="6th">6th</SelectItem>
                        <SelectItem value="7th">7th</SelectItem>
                        <SelectItem value="8th">8th</SelectItem>
                        <SelectItem value="9th">9th</SelectItem>
                        <SelectItem value="10th">10th</SelectItem>
                        <SelectItem value="11th">11th</SelectItem>
                        <SelectItem value="12th">12th</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subject Selection */}
            {selectedClass && availableSubjects.length > 0 && (
              <div className="space-y-2">
                <Label>Select Subjects</Label>
                <ScrollArea className="h-48 border rounded-md p-3">
                  <div className="space-y-3">
                    {availableSubjects.map(subject => (
                      <div key={subject.id} className="flex items-center gap-3 p-2 border rounded">
                        <Checkbox
                          id={`subject-${subject.id}`}
                          checked={!!selectedSubjects[subject.id]}
                          onCheckedChange={() => toggleSubject(subject.id)}
                        />
                        <label htmlFor={`subject-${subject.id}`} className="flex-1 text-sm font-medium">
                          {subject.name}
                        </label>
                        {selectedSubjects[subject.id] && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Max"
                              className="w-20 h-8 text-sm"
                              value={selectedSubjects[subject.id].maxMarks}
                              onChange={(e) => updateSubjectMaxMarks(subject.id, parseInt(e.target.value) || 100)}
                            />
                            <Input
                              type="date"
                              className="w-32 h-8 text-sm"
                              value={selectedSubjects[subject.id].examDate}
                              onChange={(e) => updateSubjectExamDate(subject.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(selectedSubjects).length} subjects selected
                </p>
              </div>
            )}

            {selectedClass && availableSubjects.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No subjects found for {selectedClass}. Please add subjects first.
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={Object.keys(selectedSubjects).length === 0}>
                Create Exam
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
