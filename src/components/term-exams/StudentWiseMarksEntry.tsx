import { useState, useMemo } from "react";
import { TermExam, TermExamSubject, TermExamResult, Student, Division, Subject } from "@/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Search, ChevronRight, Save, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudentWiseMarksEntryProps {
  exam: TermExam;
  examSubjects: TermExamSubject[];
  existingResults: TermExamResult[];
  students: Student[];
  divisions: Division[];
  subjects: Subject[];
  onBulkAddResults: (results: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }[]) => Promise<boolean>;
}

export function StudentWiseMarksEntry({
  exam,
  examSubjects,
  existingResults,
  students,
  divisions,
  subjects,
  onBulkAddResults,
}: StudentWiseMarksEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>("");
  const [marks, setMarks] = useState<{ [subjectId: string]: number }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filter students by exam class
  const classStudents = students.filter(s => s.class === exam.class);

  // Get available divisions for exam class
  const availableDivisions = divisions.filter(d => d.class === exam.class);

  // Filter students by search and division
  const filteredStudents = useMemo(() => {
    let filtered = classStudents;
    
    if (divisionFilter) {
      filtered = filtered.filter(s => s.divisionId === divisionFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.rollNo?.toString().includes(query)
      );
    }
    
    return filtered;
  }, [classStudents, divisionFilter, searchQuery]);

  // Get selected student
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Load existing marks when student is selected
  const loadStudentMarks = (studentId: string) => {
    const studentResults = existingResults.filter(r => r.studentId === studentId);
    const loadedMarks: { [subjectId: string]: number } = {};
    
    studentResults.forEach(r => {
      if (r.marks !== undefined && r.marks !== null) {
        loadedMarks[r.subjectId] = r.marks;
      }
    });
    
    setMarks(loadedMarks);
    setSelectedStudentId(studentId);
  };

  // Check if student has complete results
  const getStudentCompletionStatus = (studentId: string) => {
    const studentResults = existingResults.filter(r => r.studentId === studentId);
    const completedSubjects = studentResults.filter(r => r.marks !== undefined && r.marks !== null).length;
    return {
      completed: completedSubjects,
      total: examSubjects.length,
      isComplete: completedSubjects === examSubjects.length,
    };
  };

  const handleMarkChange = (subjectId: string, value: string) => {
    const numValue = parseFloat(value);
    const examSubject = examSubjects.find(es => es.subjectId === subjectId);
    const maxMarks = examSubject?.maxMarks || 100;
    
    if (value === '') {
      const { [subjectId]: removed, ...rest } = marks;
      setMarks(rest);
    } else if (!isNaN(numValue) && numValue >= 0 && numValue <= maxMarks) {
      setMarks(prev => ({ ...prev, [subjectId]: numValue }));
    }
  };

  const handleSave = async () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }

    const results = Object.entries(marks).map(([subjectId, markValue]) => ({
      termExamId: exam.id,
      studentId: selectedStudentId,
      subjectId,
      marks: markValue,
    }));

    if (results.length === 0) {
      toast.error("Please enter marks for at least one subject");
      return;
    }

    setIsSaving(true);
    const success = await onBulkAddResults(results);
    setIsSaving(false);

    if (success) {
      toast.success(`Saved marks for ${selectedStudent?.name}`);
      // Move to next student
      const currentIndex = filteredStudents.findIndex(s => s.id === selectedStudentId);
      if (currentIndex < filteredStudents.length - 1) {
        loadStudentMarks(filteredStudents[currentIndex + 1].id);
      }
    }
  };

  const clearSelection = () => {
    setSelectedStudentId("");
    setMarks({});
  };

  // Calculate total marks for selected student
  const calculateTotal = () => {
    const totalMarks = Object.values(marks).reduce((sum, m) => sum + m, 0);
    const maxTotal = examSubjects.reduce((sum, es) => sum + es.maxMarks, 0);
    const percentage = maxTotal > 0 ? (totalMarks / maxTotal) * 100 : 0;
    return { totalMarks, maxTotal, percentage: Math.round(percentage * 10) / 10 };
  };

  const { totalMarks, maxTotal, percentage } = calculateTotal();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <UserCheck className="h-4 w-4" />
          Student-wise Entry
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="w-[calc(100%-1rem)] sm:max-w-4xl h-[90vh] sm:h-[85vh] p-0 gap-0 flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-3 pb-2 border-b shrink-0">
          <DialogTitle className="text-base">Student-wise Mark Entry - {exam.name}</DialogTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{exam.term}</Badge>
            <Badge variant="outline" className="text-xs">{exam.class} Grade</Badge>
            <span>{examSubjects.length} subjects</span>
          </div>
        </DialogHeader>

        {/* Mobile: Stacked layout, Desktop: Side by side */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Student List Panel - Collapsible on mobile when student selected */}
          <div className={cn(
            "w-full md:w-64 border-b md:border-b-0 md:border-r flex flex-col shrink-0",
            selectedStudent ? "h-28 md:h-auto" : "flex-1 md:flex-initial"
          )}>
            <div className="p-2 space-y-2 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              {availableDivisions.length > 0 && !selectedStudent && (
                <Select value={divisionFilter || "all"} onValueChange={(v) => setDivisionFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All divisions</SelectItem>
                    {availableDivisions.map(div => (
                      <SelectItem key={div.id} value={div.id}>
                        Division {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-1">
                {filteredStudents.map(student => {
                  const status = getStudentCompletionStatus(student.id);
                  const isSelected = student.id === selectedStudentId;
                  
                  return (
                    <button
                      key={student.id}
                      onClick={() => loadStudentMarks(student.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors mb-0.5",
                        isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{student.name}</div>
                        <div className={cn(
                          "text-xs",
                          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {status.completed}/{status.total} subjects
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {status.isComplete && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              isSelected && "bg-primary-foreground/20 text-primary-foreground"
                            )}
                          >
                            ✓
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Marks Entry Panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {selectedStudent ? (
              <>
                <div className="p-2 border-b bg-muted/30 flex items-center justify-between shrink-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{selectedStudent.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedStudent.rollNo && `Roll No: ${selectedStudent.rollNo}`}
                      {selectedStudent.divisionId && ` • Division ${divisions.find(d => d.id === selectedStudent.divisionId)?.name}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 w-7 p-0 shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Scrollable subjects list */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-2 space-y-2">
                    {examSubjects.map(es => {
                      const subject = subjects.find(s => s.id === es.subjectId);
                      const currentMark = marks[es.subjectId];
                      const existingMark = existingResults.find(
                        r => r.studentId === selectedStudentId && r.subjectId === es.subjectId
                      )?.marks;

                      return (
                        <div key={es.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{subject?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Max: {es.maxMarks}
                              {existingMark !== undefined && (
                                <span className="ml-1 text-green-600">(Saved: {existingMark})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={es.maxMarks}
                              step="0.5"
                              placeholder="0"
                              value={currentMark ?? ''}
                              onChange={(e) => handleMarkChange(es.subjectId, e.target.value)}
                              className="w-16 h-9 text-center text-base"
                            />
                            <span className="text-xs text-muted-foreground w-8">/{es.maxMarks}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fixed footer with save button */}
                <div className="p-2 border-t bg-background shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-bold">{totalMarks}/{maxTotal}</span>
                      <span className={cn(
                        "ml-1 font-semibold text-xs",
                        percentage >= 80 ? "text-green-600" :
                        percentage >= 60 ? "text-yellow-600" :
                        percentage >= 40 ? "text-orange-600" : "text-red-600"
                      )}>
                        ({percentage}%)
                      </span>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1.5">
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? "Saving..." : "Save & Next"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                <div className="text-center">
                  <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Select a student</p>
                  <p className="text-sm">Choose a student from the list to enter their marks</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
