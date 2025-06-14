
import { useState } from "react";
import { useForm } from "react-hook-form";
import { WeeklyTest, Student, StudentTestResult } from "@/types";
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
import { Edit, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface EnterMarksDialogProps {
  test: WeeklyTest;
  students: Student[];
  existingResults: StudentTestResult[];
  onAddResult: (result: StudentTestResult) => void;
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
}

export function EnterMarksDialog({ 
  test, 
  students, 
  existingResults,
  onAddResult,
  onAwardXP 
}: EnterMarksDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [marks, setMarks] = useState<{ [studentId: string]: number }>({});

  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= test.maxMarks) {
      setMarks(prev => ({ ...prev, [studentId]: numValue }));
    }
  };

  const calculateXPRewards = (studentId: string, currentMarks: number) => {
    const percentage = (currentMarks / test.maxMarks) * 100;
    let xpAmount = 0;
    const reasons = [];

    // High score bonus
    if (percentage >= 80) {
      xpAmount += 5;
      reasons.push("80%+ score");
    }

    // Improvement bonus - check previous test results
    const studentPreviousResults = existingResults
      .filter(r => r.studentId === studentId)
      .sort((a, b) => new Date(test.date).getTime() - new Date(test.date).getTime());
    
    if (studentPreviousResults.length > 0) {
      const lastResult = studentPreviousResults[studentPreviousResults.length - 1];
      const lastPercentage = (lastResult.marks / test.maxMarks) * 100;
      if (percentage > lastPercentage) {
        xpAmount += 3;
        reasons.push("improved from last test");
      }
    }

    return { xpAmount, reasons };
  };

  const handleSubmit = () => {
    let resultsAdded = 0;
    
    Object.entries(marks).forEach(([studentId, markValue]) => {
      if (markValue >= 0 && markValue <= test.maxMarks) {
        const result: StudentTestResult = {
          testId: test.id,
          studentId,
          marks: markValue
        };
        
        onAddResult(result);
        resultsAdded++;

        // Award XP based on performance
        const { xpAmount, reasons } = calculateXPRewards(studentId, markValue);
        if (xpAmount > 0) {
          onAwardXP(studentId, xpAmount, `Test: ${test.name} (${reasons.join(', ')})`);
        }
      }
    });

    if (resultsAdded > 0) {
      toast.success(`Added marks for ${resultsAdded} students and awarded XP!`);
      setMarks({});
      setIsOpen(false);
    }
  };

  const getExistingMark = (studentId: string) => {
    const existing = existingResults.find(r => r.studentId === studentId);
    return existing ? existing.marks : undefined;
  };

  const completedCount = existingResults.length;
  const totalCount = students.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Enter Marks
          <Badge variant="secondary" className="ml-1">
            {completedCount}/{totalCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Enter Marks - {test.name}</DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{test.subject}</span>
            <span>Max: {test.maxMarks} marks</span>
            <span>{new Date(test.date).toLocaleDateString()}</span>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            {students.map((student) => {
              const existingMark = getExistingMark(student.id);
              const currentMark = marks[student.id];
              const hasResult = existingMark !== undefined;
              
              return (
                <div key={student.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.class} Grade</div>
                  </div>
                  
                  {hasResult && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50">
                        {existingMark}/{test.maxMarks}
                      </Badge>
                      <span className="text-sm text-green-600">
                        {Math.round((existingMark / test.maxMarks) * 100)}%
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`marks-${student.id}`} className="sr-only">
                      Marks for {student.name}
                    </Label>
                    <Input
                      id={`marks-${student.id}`}
                      type="number"
                      min="0"
                      max={test.maxMarks}
                      step="0.5"
                      placeholder={hasResult ? existingMark.toString() : "0"}
                      value={currentMark || ''}
                      onChange={(e) => handleMarkChange(student.id, e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">/{test.maxMarks}</span>
                  </div>
                  
                  {currentMark !== undefined && (
                    <div className="flex items-center gap-1">
                      {(currentMark / test.maxMarks) * 100 >= 80 && (
                        <Trophy className="h-4 w-4 text-yellow-500" title="+5 XP for 80%+" />
                      )}
                      <TrendingUp className="h-4 w-4 text-green-500" title="Potential +3 XP for improvement" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {Object.keys(marks).length} students will receive marks
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={Object.keys(marks).length === 0}>
                Save Marks & Award XP
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
