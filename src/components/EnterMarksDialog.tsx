
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trophy, TrendingUp, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

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
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreviewData, setBulkPreviewData] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Filter students by class if test has a specific class
  const filteredStudents = test.class && test.class !== "All" 
    ? students.filter(student => student.class === test.class)
    : students;

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

  // Bulk upload functions
  const downloadTemplate = () => {
    const templateData = filteredStudents.map(student => ({
      "Student Name": student.name,
      "Student ID": student.id,
      "Marks": ""
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Marks");
    XLSX.writeFile(wb, `${test.name}_marks_template.xlsx`);
    toast.success("Template downloaded successfully!");
  };

  const handleBulkFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please select an Excel file (.xlsx or .xls)");
      return;
    }

    setBulkFile(selectedFile);
    parseBulkExcelFile(selectedFile);
  };

  const parseBulkExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setBulkPreviewData(jsonData);
        validateBulkData(jsonData);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error("Error reading Excel file. Please check the format.");
        setBulkErrors(["Error reading Excel file. Please check the format."]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateBulkData = (data: any[]) => {
    const newErrors: string[] = [];
    
    if (data.length === 0) {
      newErrors.push("Excel file is empty");
      setBulkErrors(newErrors);
      return;
    }

    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      if (!row["Student Name"] && !row["Student ID"]) {
        newErrors.push(`Row ${rowNum}: Student Name or Student ID is required`);
      }
      
      if (row["Marks"] === undefined || row["Marks"] === null || row["Marks"] === "") {
        newErrors.push(`Row ${rowNum}: Marks field is required`);
      } else {
        const markValue = parseFloat(row["Marks"]);
        if (isNaN(markValue) || markValue < 0 || markValue > test.maxMarks) {
          newErrors.push(`Row ${rowNum}: Marks must be a number between 0 and ${test.maxMarks}`);
        }
      }
    });

    setBulkErrors(newErrors);
  };

  const handleBulkSubmit = () => {
    if (!bulkFile || bulkPreviewData.length === 0 || bulkErrors.length > 0) {
      toast.error("Please fix all errors before importing");
      return;
    }

    let resultsAdded = 0;

    bulkPreviewData.forEach(row => {
      // Find student by name or ID
      const student = filteredStudents.find(s => 
        s.name === row["Student Name"] || s.id === row["Student ID"]
      );

      if (student && row["Marks"] !== undefined && row["Marks"] !== "") {
        const markValue = parseFloat(row["Marks"]);
        if (!isNaN(markValue) && markValue >= 0 && markValue <= test.maxMarks) {
          const result: StudentTestResult = {
            testId: test.id,
            studentId: student.id,
            marks: markValue
          };
          
          onAddResult(result);
          resultsAdded++;

          // Award XP based on performance
          const { xpAmount, reasons } = calculateXPRewards(student.id, markValue);
          if (xpAmount > 0) {
            onAwardXP(student.id, xpAmount, `Test: ${test.name} (${reasons.join(', ')})`);
          }
        }
      }
    });

    if (resultsAdded > 0) {
      toast.success(`Successfully imported marks for ${resultsAdded} students!`);
      // Reset bulk upload state
      setBulkFile(null);
      setBulkPreviewData([]);
      setBulkErrors([]);
      setIsOpen(false);
    }
  };

  const getExistingMark = (studentId: string) => {
    const existing = existingResults.find(r => r.studentId === studentId);
    return existing ? existing.marks : undefined;
  };

  const completedCount = existingResults.filter(r => 
    filteredStudents.some(s => s.id === r.studentId)
  ).length;
  const totalCount = filteredStudents.length;

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
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Enter Marks - {test.name}</DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{test.subject}</span>
            <span>Max: {test.maxMarks} marks</span>
            <span>{new Date(test.date).toLocaleDateString()}</span>
            {test.class && test.class !== "All" && (
              <Badge variant="outline">{test.class} Grade</Badge>
            )}
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-4">
                {filteredStudents.map((student) => {
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
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                          <TrendingUp className="h-4 w-4 text-green-500" />
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
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-6">
              {/* Template Download */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <span className="text-sm text-muted-foreground">
                  Use this template with student names and IDs pre-filled
                </span>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="bulk-marks-file">Upload Excel File</Label>
                <Input
                  id="bulk-marks-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBulkFileChange}
                />
              </div>

              {/* Errors */}
              {bulkErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Please fix the following errors:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {bulkErrors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {bulkPreviewData.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview ({bulkPreviewData.length} records)</Label>
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Student Name</th>
                          <th className="p-2 text-left">Marks</th>
                          <th className="p-2 text-left">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreviewData.slice(0, 10).map((row, index) => {
                          const markValue = parseFloat(row["Marks"]);
                          const percentage = !isNaN(markValue) ? (markValue / test.maxMarks) * 100 : 0;
                          return (
                            <tr key={index} className="border-t">
                              <td className="p-2">{row["Student Name"]}</td>
                              <td className="p-2">{row["Marks"]}/{test.maxMarks}</td>
                              <td className="p-2">{Math.round(percentage)}%</td>
                            </tr>
                          );
                        })}
                        {bulkPreviewData.length > 10 && (
                          <tr className="border-t">
                            <td colSpan={3} className="p-2 text-center text-muted-foreground">
                              ... and {bulkPreviewData.length - 10} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-muted-foreground">
                  {bulkPreviewData.length} marks will be imported
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkSubmit}
                    disabled={!bulkFile || bulkPreviewData.length === 0 || bulkErrors.length > 0}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import Marks
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
