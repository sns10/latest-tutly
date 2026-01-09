import { useState, useMemo, useEffect, useCallback } from "react";
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
import { Edit, Upload, Download, FileText, Loader2, WifiOff, FileWarning } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { useTermExamMarksDraft } from "@/hooks/useMarksDraft";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface EnterTermExamMarksDialogProps {
  exam: TermExam;
  examSubjects: TermExamSubject[];
  existingResults: TermExamResult[];
  students: Student[];
  divisions: Division[];
  subjects: Subject[];
  onAddResult: (result: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }) => void;
  onBulkAddResults: (results: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }[]) => Promise<boolean>;
}

export function EnterTermExamMarksDialog({
  exam,
  examSubjects,
  existingResults,
  students,
  divisions,
  subjects,
  onAddResult,
  onBulkAddResults,
}: EnterTermExamMarksDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [marks, setMarks] = useState<{ [studentId: string]: number }>({});
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreviewData, setBulkPreviewData] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingResults, setPendingResults] = useState<{ termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }[]>([]);
  const [isBulkConfirm, setIsBulkConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Draft and network status
  const { getDraft, saveDraft, clearDraft, hasDraft } = useTermExamMarksDraft(exam.id);
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
      saveDraft(marks, selectedSubjectId, selectedDivision);
    }
  }, [marks, selectedSubjectId, selectedDivision, saveDraft]);

  const restoreDraft = useCallback(() => {
    const draft = getDraft();
    if (draft) {
      setMarks(draft.marks);
      setRawInputs({}); // Clear raw inputs so they use marks values
      if (draft.selectedSubjectId) setSelectedSubjectId(draft.selectedSubjectId);
      if (draft.selectedDivision) setSelectedDivision(draft.selectedDivision);
      setShowDraftBanner(false);
      toast.success(`Restored ${Object.keys(draft.marks).length} marks from draft`);
    }
  }, [getDraft]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
    setRawInputs({}); // Clear raw inputs
  }, [clearDraft]);

  // Filter students by exam class
  const classStudents = students.filter(s => s.class === exam.class);

  // Get available divisions for exam class
  const availableDivisions = divisions.filter(d => d.class === exam.class);

  // Filter by division if selected
  const filteredStudents = useMemo(() => {
    if (!selectedDivision) return classStudents;
    return classStudents.filter(s => s.divisionId === selectedDivision);
  }, [classStudents, selectedDivision]);

  // Get selected subject details
  const selectedExamSubject = examSubjects.find(es => es.subjectId === selectedSubjectId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Store raw input values for controlled inputs (allows typing freely)
  const [rawInputs, setRawInputs] = useState<{ [studentId: string]: string }>({});

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
    const maxMarks = selectedExamSubject?.maxMarks || 100;
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxMarks) {
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

  const getExistingMark = (studentId: string) => {
    const existing = existingResults.find(
      r => r.studentId === studentId && r.subjectId === selectedSubjectId
    );
    return existing?.marks;
  };

  const handleSubmit = () => {
    if (!selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }

    const resultsToAdd: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }[] = [];
    Object.entries(marks).forEach(([studentId, markValue]) => {
      const maxMarks = selectedExamSubject?.maxMarks || 100;
      if (markValue >= 0 && markValue <= maxMarks) {
        resultsToAdd.push({
          termExamId: exam.id,
          studentId,
          subjectId: selectedSubjectId,
          marks: markValue,
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
      const success = await onBulkAddResults(pendingResults);
      if (success) {
        toast.success(`Added marks for ${pendingResults.length} students!`);
        clearDraft();
        setMarks({});
        setRawInputs({}); // Clear raw inputs after successful save
        setPendingResults([]);
        setShowConfirmDialog(false);
      } else {
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
    // Create template with all subjects as columns
    const templateData = filteredStudents.map(student => {
      const row: any = {
        "Student ID": student.id,
        "Student Name": student.name,
      };
      examSubjects.forEach(es => {
        const subj = subjects.find(s => s.id === es.subjectId);
        if (subj) {
          row[`${subj.name} (Max: ${es.maxMarks})`] = "";
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Term Exam Marks");
    XLSX.writeFile(wb, `${exam.name}_marks_template.xlsx`);
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
      if (!row["Student ID"]) {
        newErrors.push(`Row ${rowNum}: Student ID is required`);
      }
    });

    setBulkErrors(newErrors);
  };

  const handleBulkSubmit = async () => {
    if (!bulkFile || bulkPreviewData.length === 0 || bulkErrors.length > 0) {
      toast.error("Please fix all errors before importing");
      return;
    }

    const results: { termExamId: string; studentId: string; subjectId: string; marks?: number; grade?: string }[] = [];

    bulkPreviewData.forEach(row => {
      const student = filteredStudents.find(s => 
        s.id === row["Student ID"] || s.name === row["Student Name"]
      );

      if (student) {
        examSubjects.forEach(es => {
          const subj = subjects.find(s => s.id === es.subjectId);
          if (subj) {
            const columnName = `${subj.name} (Max: ${es.maxMarks})`;
            const markValue = row[columnName];
            if (markValue !== undefined && markValue !== "") {
              const numValue = parseFloat(String(markValue));
              if (!isNaN(numValue) && numValue >= 0 && numValue <= es.maxMarks) {
                results.push({
                  termExamId: exam.id,
                  studentId: student.id,
                  subjectId: es.subjectId,
                  marks: numValue,
                });
              }
            }
          }
        });
      }
    });

    if (results.length === 0) {
      toast.error("No valid marks found to import");
      return;
    }

    // Show confirmation dialog
    setPendingResults(results);
    setIsBulkConfirm(true);
    setShowConfirmDialog(true);
  };

  const confirmBulkSaveMarks = async () => {
    if (pendingResults.length === 0) return;

    setIsSaving(true);

    try {
      const success = await onBulkAddResults(pendingResults);
      if (success) {
        toast.success(`Successfully imported ${pendingResults.length} marks!`);
        clearDraft();
        setBulkFile(null);
        setBulkPreviewData([]);
        setBulkErrors([]);
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

  const completedCount = existingResults.filter(r => 
    r.termExamId === exam.id && filteredStudents.some(s => s.id === r.studentId)
  ).length;
  const totalPossible = filteredStudents.length * examSubjects.length;

  const hasUnsavedChanges = Object.keys(marks).length > 0;

  const handleDialogClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      toast.info("Your marks have been saved as a draft");
    }
    setIsOpen(open);
    if (!open) {
      setShowDraftBanner(false);
      setRawInputs({}); // Clear raw inputs when dialog closes
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Edit className="h-4 w-4" />
          Enter Marks
          <Badge variant="secondary" className="ml-1">
            {completedCount}/{totalPossible}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="w-[calc(100%-1rem)] sm:max-w-4xl max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
          <DialogTitle>Enter Marks - {exam.name}</DialogTitle>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{exam.term}</Badge>
            <Badge variant="outline">{exam.class} Grade</Badge>
            <span>{examSubjects.length} subjects</span>
          </div>
        </DialogHeader>

        {/* Offline Banner */}
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You're offline. Marks will be saved locally as a draft. Save to server when back online.
            </AlertDescription>
          </Alert>
        )}

        {/* Draft Restore Banner */}
        {showDraftBanner && (
          <Alert className="bg-amber-50 border-amber-200">
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

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            {/* Subject and Division Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Select Subject</Label>
                <Select 
                  value={selectedSubjectId} 
                  onValueChange={(value) => {
                    setSelectedSubjectId(value);
                    setRawInputs({}); // Clear raw inputs when subject changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {examSubjects.map(es => {
                      const subj = subjects.find(s => s.id === es.subjectId);
                      return (
                        <SelectItem key={es.subjectId} value={es.subjectId}>
                          {subj?.name} (Max: {es.maxMarks})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {availableDivisions.length > 0 && (
                <div>
                  <Label>Filter by Division</Label>
                  <Select value={selectedDivision || "all"} onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}>
                    <SelectTrigger>
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

            {selectedSubjectId && (
              <div className="max-h-[45vh] sm:max-h-[400px] overflow-y-auto overscroll-contain touch-pan-y pr-4">
                <div className="space-y-3">
                  {filteredStudents.map(student => {
                    const existingMark = getExistingMark(student.id);
                    const currentMark = marks[student.id];
                    const maxMarks = selectedExamSubject?.maxMarks || 100;

                    return (
                      <div key={student.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{student.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.division?.name ? `Div ${student.division.name}` : ''}
                          </div>
                        </div>

                        {existingMark !== undefined && (
                          <Badge variant="outline" className="bg-green-50">
                            {existingMark}/{maxMarks}
                          </Badge>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            placeholder={existingMark?.toString() || "0"}
                            value={getInputValue(student.id)}
                            onChange={(e) => handleMarkChange(student.id, e.target.value)}
                            className="w-16 h-10 text-base text-center"
                          />
                          <span className="text-sm text-muted-foreground">/{maxMarks}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!selectedSubjectId && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a subject to enter marks</p>
              </div>
            )}

            <DialogFooter>
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-muted-foreground">
                  {Object.keys(marks).length} students will receive marks
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={Object.keys(marks).length === 0 || !selectedSubjectId || !isOnline}
                  >
                    Save Marks
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-4">
              {/* Division Filter */}
              {availableDivisions.length > 0 && (
                <div>
                  <Label>Filter by Division (for template)</Label>
                  <Select value={selectedDivision || "all"} onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}>
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

              {/* Template Download */}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <span className="text-sm text-muted-foreground">
                  All subjects as columns. Enter marks for each.
                </span>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="bulk-term-exam-file">Upload Excel File</Label>
                <Input
                  id="bulk-term-exam-file"
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
                      {bulkErrors.slice(0, 5).map((error, i) => (
                        <p key={i}>{error}</p>
                      ))}
                      {bulkErrors.length > 5 && (
                        <p>...and {bulkErrors.length - 5} more errors</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {bulkPreviewData.length > 0 && bulkErrors.length === 0 && (
                <Alert>
                  <AlertDescription>
                    Ready to import marks for {bulkPreviewData.length} students across {examSubjects.length} subjects
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkSubmit}
                  disabled={!bulkFile || bulkPreviewData.length === 0 || bulkErrors.length > 0 || !isOnline}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import Marks
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={(open) => !isSaving && setShowConfirmDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save Marks</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to save marks for <strong>{pendingResults.length} entries</strong> in exam "{exam.name}".</p>
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
