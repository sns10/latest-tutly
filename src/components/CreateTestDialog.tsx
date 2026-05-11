
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, TestTube2 } from "lucide-react";
import { WeeklyTest, ClassName, Subject, Division } from "@/types";

const formSchema = z.object({
  name: z.string().min(2, "Test name must be at least 2 characters."),
  subject: z.string().min(1, "Please select a subject."),
  maxMarks: z.number().int().positive("Max marks must be a positive number."),
  date: z.date(),
  class: z.enum(["4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "All"]),
  divisionId: z.string().optional(),
});

interface CreateTestDialogProps {
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
  subjects: Subject[];
  divisions?: Division[];
}

export function CreateTestDialog({ onAddTest, subjects, divisions = [] }: CreateTestDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const defaultValues: z.infer<typeof formSchema> = {
    name: "",
    subject: "",
    maxMarks: 100,
    date: new Date(),
    class: "All",
    divisionId: "all",
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const selectedClass = form.watch("class");

  // Filter subjects based on selected class
  const filteredSubjects = useMemo(() => {
    if (selectedClass === "All") {
      // Get unique subject names when "All" is selected
      const uniqueSubjects = new Map<string, Subject>();
      subjects.forEach(s => {
        if (!uniqueSubjects.has(s.name)) {
          uniqueSubjects.set(s.name, s);
        }
      });
      return Array.from(uniqueSubjects.values());
    }
    return subjects.filter(s => s.class === selectedClass);
  }, [subjects, selectedClass]);

  // Divisions available for the selected class
  const availableDivisions = useMemo(() => {
    if (selectedClass === "All") return [];
    return divisions.filter(d => d.class === selectedClass);
  }, [divisions, selectedClass]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddTest({
      name: values.name,
      subject: values.subject,
      maxMarks: values.maxMarks,
      date: values.date.toISOString(),
      class: values.class,
      divisionId: values.divisionId && values.divisionId !== "all" ? values.divisionId : undefined,
    });
    form.reset(defaultValues);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chapter 5 Quiz" {...field} />
                  </FormControl>
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
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("subject", "", { shouldValidate: true });
                      form.setValue("divisionId", "all");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className={selectedClass === "All" ? "hidden" : "block"}>
              <FormField
                control={form.control}
                name="divisionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Division</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "all"}
                      disabled={selectedClass === "All" || availableDivisions.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All Divisions" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {availableDivisions.map(div => (
                          <SelectItem key={div.id} value={div.id}>
                            Division {div.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredSubjects.length === 0 ? (
                        <SelectItem value="no-subjects" disabled>
                          No subjects available for this class
                        </SelectItem>
                      ) : (
                        filteredSubjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.name}>
                            {subject.name} {selectedClass === "All" ? "" : `(${subject.class})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxMarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Marks</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Test Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Create Test</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
