import { useState, useMemo, useEffect, useCallback } from "react";
import { WeeklyTest, Student, StudentTestResult, Division } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trophy, TrendingUp, Upload, Download, Search, Loader2, WifiOff, FileWarning } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { useWeeklyTestMarksDraft } from "@/hooks/useMarksDraft";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface EnterMarksDialogProps {
  test: WeeklyTest;
  students: Student[];
  existingResults: StudentTestResult[];
  divisions?: Division[];
  onAddResult: (result: StudentTestResult) => Promise<boolean>;
  onAddResultsBatch?: (results: StudentTestResult[]) => Promise<boolean>;
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
}

export function EnterMarksDialog({ 
  test, 
  students, 
  existingResults,
  divisions = [],
  onAddResult,
  onAddResultsBatch,
  onAwardXP 
}: EnterMarksDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [marks, setMarks] = useState<{ [studentId: string]: number }>({});
  const [rawInputs, setRawInputs] = useState<{ [studentId: string]: string }>({});
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreviewData, setBulkPreviewData] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingResults, setPendingResults] = useState<StudentTestResult[]>([]);
  const [isBulkConfirm, setIsBulkConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('manual');

  // Draft and network status
  const { getDraft, saveDraft, clearDraft, hasDraft } = useWeeklyTestMarksDraft(test.id);
  const { isOnline } = useNetworkStatus();

  // Check for draft when dialog opens
  useEffect(() => {
    if (isOpen && hasDraft()) {
      setShowDraftBanner(true);
    }
  }, [isOpen, hasDraft]);

  // Auto-save marks to draft when they change
  useEffect(() => {
    if (Object.keys(marks).length > 0) {
      saveDraft(marks);
    } else {
      // Clear draft when marks become empty
      clearDraft();
    }
  }, [marks, saveDraft, clearDraft]);

  const restoreDraft = useCallback(() => {
    const draft = getDraft();
    if (draft) {
      setMarks(draft.marks);
      setRawInputs({}); // Clear raw inputs so they use marks values
      setShowDraftBanner(false);
      toast.success(`Restored ${Object.keys(draft.marks).length} marks from draft`);
    }
  }, [getDraft]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
    setRawInputs({});
  }, [clearDraft]);

  // Filter students by class if test has a specific class
  const classFilteredStudents = test.class && test.class !== "All" 
    ? students.filter(student => student.class === test.class)
    : students;

  // Get available divisions for the test class
  const availableDivisions = useMemo(() => {
    if (!test.class || test.class === "All") return [];
    return divisions.filter(d => d.class === test.class);
  }, [divisions, test.class]);

  // Filter by division and search query
  const filteredStudents = useMemo(() => {
    let result = classFilteredStudents;
    
    if (selectedDivision) {
      result = result.filter(s => s.divisionId === selectedDivision);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.rollNo?.toString().includes(query)
      );
    }
    
    return result;
  }, [classFilteredStudents, selectedDivision, searchQuery]);

  const handleMarkChange = (studentId: string, value: string) => {
    // Always update raw input to allow free typing
    setRawInputs(prev => ({ ...prev, [studentId]: value }));
    
    // Allow empty string to clear the mark
    if (value === '' || value === undefined) {
      setMarks(prev => {
        const { [studentId]: removed, ...rest } = prev;
        return rest;
      });
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= test.maxMarks) {
      setMarks(prev => ({ ...prev, [studentId]: numValue }));
    }
  };

  // Get display value for input - prefer raw input for typing, fall back to marks
  const getInputValue = (studentId: string): string => {
    if (rawInputs[studentId] !== undefined) {
      return rawInputs[studentId];
    }
    const mark = marks[studentId];
    return mark !== undefined ? mark.toString() : '';
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

    // Improvement bonus - check previous test results for this student
    const studentPreviousResults = existingResults
      .filter(r => r.studentId === studentId && r.testId !== test.id);
    
    if (studentPreviousResults.length > 0) {
      // Use the first available previous result for comparison
      const lastResult = studentPreviousResults[0];
      const lastPercentage = (lastResult.marks / test.maxMarks) * 100;
      if (percentage > lastPercentage) {
        xpAmount += 3;
        reasons.push("improved from last test");
      }
    }

    return { xpAmount, reasons };
  };

  const handleSubmit = () => {
    const resultsToAdd: StudentTestResult[] = [];
    
    Object.entries(marks).forEach(([studentId, markValue]) => {
      if (markValue >= 0 && markValue <= test.maxMarks) {
        resultsToAdd.push({
          testId: test.id,
          studentId,
          marks: markValue
        });
      }
    });

    if (resultsToAdd.length === 0) return;

    // Show confirmation dialog
    setPendingResults(resultsToAdd);
    setIsBulkConfirm(false);
    setShowConfirmDialog(true);
  };

  const confirmSaveMarks = async () => {
    if (pendingResults.length === 0) return;

    setIsSaving(true);
    
    try {
      let success = false;
      
      // Use batch function if available, otherwise fall back to individual calls
      if (onAddResultsBatch) {
        success = await onAddResultsBatch(pendingResults);
      } else {
        // Sequential save with early exit on failure
        for (const result of pendingResults) {
          const resultSuccess = await onAddResult(result);
          if (!resultSuccess) {
            success = false;
            break;
          }
          success = true;
        }
        if (success) {
          toast.success(`Added marks for ${pendingResults.length} students!`);
        }
      }

      if (success) {
        // Award XP based on performance
        pendingResults.forEach(result => {
          const { xpAmount, reasons } = calculateXPRewards(result.studentId, result.marks);
          if (xpAmount > 0) {
            onAwardXP(result.studentId, xpAmount, `Test: ${test.name} (${reasons.join(', ')})`);
          }
        });

        // Clear state and close only after confirmed success
        clearDraft();
        setMarks({});
        setRawInputs({});
        setSearchQuery('');
        setPendingResults([]);
        setShowConfirmDialog(false);
        setIsOpen(false);
      } else {
        // Keep dialog open, keep marks - show error
        toast.error("Failed to save marks. Your data is preserved. Please try again.");
        setShowConfirmDialog(false);
      }
    } catch (error) {
      console.error('Error saving marks:', error);
      toast.error("Failed to save marks. Your data is preserved. Please try again.");
      setShowConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk upload functions
  const downloadTemplate = () => {
    const templateData = filteredStudents.map(student => ({
      "Student ID": student.id,
      "Student Name": student.name,
      "Marks/Grade": "",
      "Note": "Enter marks (e.g., 85) OR grade (e.g., A+, A, B+, B, C+, C, D, F)"
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Marks");
    XLSX.writeFile(wb, `${test.name}_marks_template.xlsx`);
    toast.success("Template downloaded successfully!");
  };

  // Convert grade to marks based on percentage
  const gradeToMarks = (grade: string): number => {
    const gradeMap: { [key: string]: number } = {
      'A+': 0.95,
      'A': 0.90,
      'A-': 0.85,
      'B+': 0.80,
      'B': 0.75,
      'B-': 0.70,
      'C+': 0.65,
      'C': 0.60,
      'C-': 0.55,
      'D': 0.50,
      'F': 0.40
    };
    
    const normalizedGrade = grade.trim().toUpperCase();
    const percentage = gradeMap[normalizedGrade];
    
    if (percentage !== undefined) {
      return Math.round(test.maxMarks * percentage);
    }
    
    return -1; // Invalid grade
  };

  // Parse marks or grade from input
  const parseMarksOrGrade = (input: string | number): number => {
    if (typeof input === 'number') {
      return input;
    }
    
    const trimmedInput = String(input).trim();
    
    // Try parsing as number first
    const numValue = parseFloat(trimmedInput);
    if (!isNaN(numValue)) {
      return numValue;
    }
    
    // Try parsing as grade
    return gradeToMarks(trimmedInput);
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
      
      if (!row["Student ID"]) {
        newErrors.push(`Row ${rowNum}: Student ID is required`);
      }
      
      const marksOrGrade = row["Marks/Grade"] || row["Marks"] || row["Grade"];
      if (marksOrGrade === undefined || marksOrGrade === null || marksOrGrade === "") {
        newErrors.push(`Row ${rowNum}: Marks/Grade field is required`);
      } else {
        const markValue = parseMarksOrGrade(marksOrGrade);
        if (markValue < 0 || markValue > test.maxMarks) {
          newErrors.push(`Row ${rowNum}: Invalid marks/grade - must be a number between 0 and ${test.maxMarks} or a valid grade (A+, A, B+, B, C+, C, D, F)`);
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

    const resultsToAdd: StudentTestResult[] = [];

    bulkPreviewData.forEach(row => {
      // Find student by ID (primary) or name (fallback)
      const student = classFilteredStudents.find(s => 
        s.id === row["Student ID"] || s.name === row["Student Name"]
      );

      const marksOrGrade = row["Marks/Grade"] || row["Marks"] || row["Grade"];
      if (student && marksOrGrade !== undefined && marksOrGrade !== "") {
        const markValue = parseMarksOrGrade(marksOrGrade);
        if (markValue >= 0 && markValue <= test.maxMarks) {
          resultsToAdd.push({
            testId: test.id,
            studentId: student.id,
            marks: markValue
          });
        }
      }
    });

    if (resultsToAdd.length === 0) {
      toast.error("No valid marks found to import");
      return;
    }

    // Show confirmation dialog
    setPendingResults(resultsToAdd);
    setIsBulkConfirm(true);
    setShowConfirmDialog(true);
  };

  const confirmBulkSaveMarks = async () => {
    if (pendingResults.length === 0) return;

    setIsSaving(true);

    try {
      let success = false;

      // Use batch function if available
      if (onAddResultsBatch) {
        success = await onAddResultsBatch(pendingResults);
      } else {
        for (const result of pendingResults) {
          const resultSuccess = await onAddResult(result);
          if (!resultSuccess) {
            success = false;
            break;
          }
          success = true;
        }
        if (success) {
          toast.success(`Successfully imported marks for ${pendingResults.length} students!`);
        }
      }

      if (success) {
        // Award XP based on performance
        pendingResults.forEach(result => {
          const { xpAmount, reasons } = calculateXPRewards(result.studentId, result.marks);
          if (xpAmount > 0) {
            onAwardXP(result.studentId, xpAmount, `Test: ${test.name} (${reasons.join(', ')})`);
          }
        });

        // Reset bulk upload state and close only after success
        clearDraft();
        setBulkFile(null);
        setBulkPreviewData([]);
        setBulkErrors([]);
        setSearchQuery('');
        setRawInputs({});
        setPendingResults([]);
        setShowConfirmDialog(false);
        setIsOpen(false);
      } else {
        toast.error("Failed to import marks. Please try again.");
        setShowConfirmDialog(false);
      }
    } catch (error) {
      console.error('Error saving bulk marks:', error);
      toast.error("Failed to import marks. Please try again.");
      setShowConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getExistingMark = (studentId: string) => {
    const existing = existingResults.find(r => r.studentId === studentId && r.testId === test.id);
    return existing ? existing.marks : undefined;
  };

  const completedCount = existingResults.filter(r => 
    r.testId === test.id && filteredStudents.some(s => s.id === r.studentId)
  ).length;
  const totalCount = filteredStudents.length;

  const hasUnsavedChanges = Object.keys(marks).length > 0;

  const handleDialogClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      // Marks will be preserved in draft automatically
      toast.info("Your marks have been saved as a draft");
    }
    setIsOpen(open);
    if (!open) {
      setShowDraftBanner(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto justify-center">
          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="whitespace-nowrap">Enter Marks</span>
          <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">
            {completedCount}/{totalCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="w-[calc(100%-1rem)] sm:max-w-4xl max-h-[85dvh] sm:max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg pr-6">Enter Marks - {test.name}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <span>{test.subject}</span>
            <span>Max: {test.maxMarks}</span>
            <span className="hidden sm:inline">{new Date(test.date).toLocaleDateString()}</span>
            {test.class && test.class !== "All" && (
              <Badge variant="outline" className="text-xs">{test.class} Grade</Badge>
            )}
          </div>
        </DialogHeader>

        {/* Offline Banner */}
        {!isOnline && (
          <Alert variant="destructive" className="flex-shrink-0">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You're offline. Marks will be saved locally as a draft. Save to server when back online.
            </AlertDescription>
          </Alert>
        )}

        {/* Draft Restore Banner */}
        {showDraftBanner && (
          <Alert className="flex-shrink-0 bg-amber-50 border-amber-200">
            <FileWarning className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-800">
              <span>
                Draft found: {Object.keys(getDraft()?.marks || {}).length} marks saved locally
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={restoreDraft} className="h-7 text-xs">
                  Restore Draft
                </Button>
                <Button size="sm" variant="ghost" onClick={discardDraft} className="h-7 text-xs">
                  Discard
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          {/* Search and Division Filter */}
          <div className="py-3 space-y-3 flex-shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student by name or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Division Filter */}
            {availableDivisions.length > 0 && (
              <div>
                <Label className="text-sm mb-2 block">Filter by Division</Label>
                <Select 
                  value={selectedDivision || "all"} 
                  onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-48">
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
              </div>
            )}
          </div>
          
          <TabsContent value="manual" className="flex-1 min-h-0 overflow-y-auto mt-0">
            <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students found matching "{searchQuery}"
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const existingMark = getExistingMark(student.id);
                  const currentMark = marks[student.id];
                  const hasResult = existingMark !== undefined;
                  
                  return (
                    <div key={student.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">{student.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{student.class} Grade</div>
                      </div>
                      
                      {hasResult && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-xs">
                            {existingMark}/{test.maxMarks}
                          </Badge>
                          <span className="text-xs sm:text-sm text-green-600">
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
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          placeholder={hasResult ? existingMark.toString() : "0"}
                          value={getInputValue(student.id)}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          className="w-16 sm:w-20 h-10 text-base sm:text-sm text-center"
                        />
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">/{test.maxMarks}</span>
                      </div>
                      
                      {currentMark !== undefined && (
                        <div className="flex items-center gap-1">
                          {(currentMark / test.maxMarks) * 100 >= 80 && (
                            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                          )}
                          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="flex-1 min-h-0 overflow-y-auto mt-0">
            <div className="space-y-4 sm:space-y-6 pr-2 sm:pr-4">
              {/* Template Download */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Student IDs pre-filled. Enter marks (e.g., 85) OR grades (A+, A, B+, B, C+, C, D, F)
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
                  <Label className="text-sm">Preview ({bulkPreviewData.length} records)</Label>
                  <div className="border rounded-lg max-h-40 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Student ID</th>
                          <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Student Name</th>
                          <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Input</th>
                          <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Marks</th>
                          <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreviewData.slice(0, 10).map((row, index) => {
                          const marksOrGrade = row["Marks/Grade"] || row["Marks"] || row["Grade"];
                          const markValue = parseMarksOrGrade(marksOrGrade);
                          const percentage = markValue >= 0 ? (markValue / test.maxMarks) * 100 : 0;
                          return (
                            <tr key={index} className="border-t">
                              <td className="p-1.5 sm:p-2 font-mono text-xs">{row["Student ID"]}</td>
                              <td className="p-1.5 sm:p-2 truncate max-w-[120px] sm:max-w-none">{row["Student Name"]}</td>
                              <td className="p-1.5 sm:p-2">{marksOrGrade}</td>
                              <td className="p-1.5 sm:p-2 whitespace-nowrap">{markValue >= 0 ? `${markValue}/${test.maxMarks}` : 'Invalid'}</td>
                              <td className="p-1.5 sm:p-2">{markValue >= 0 ? `${Math.round(percentage)}%` : '-'}</td>
                            </tr>
                          );
                        })}
                        {bulkPreviewData.length > 10 && (
                          <tr className="border-t">
                            <td colSpan={5} className="p-1.5 sm:p-2 text-center text-muted-foreground text-xs">
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
          </TabsContent>
        </Tabs>

        {/* Fixed Footer - Always visible at bottom */}
        <div className="flex-shrink-0 border-t bg-background pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          {activeTab === 'manual' ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {Object.keys(marks).length} students will receive marks
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => handleDialogClose(false)} className="flex-1 sm:flex-none text-sm">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={Object.keys(marks).length === 0 || !isOnline} 
                  className="flex-1 sm:flex-none text-sm"
                >
                  Save Marks
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {bulkPreviewData.length} marks will be imported
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => handleDialogClose(false)} className="flex-1 sm:flex-none text-sm">
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkSubmit}
                  disabled={!bulkFile || bulkPreviewData.length === 0 || bulkErrors.length > 0 || !isOnline}
                  className="flex items-center gap-2 flex-1 sm:flex-none text-sm"
                >
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                  Import
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={(open) => !isSaving && setShowConfirmDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save Marks</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to save marks for <strong>{pendingResults.length} students</strong> in test "{test.name}".</p>
              <p className="text-sm">This action will update existing marks if any.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isSaving}
              onClick={() => {
                if (!isSaving) {
                  setShowConfirmDialog(false);
                  setPendingResults([]);
                }
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={isBulkConfirm ? confirmBulkSaveMarks : confirmSaveMarks}
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${pendingResults.length} Marks`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
