
import { useState, useRef } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Student, ClassName } from "@/types";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

interface BulkImportStudentsDialogProps {
  onImportStudents: (students: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>[]) => void;
}

const classNames: ClassName[] = ["8th", "9th", "10th", "11th"];
const avatars = [
  'photo-1582562124811-c09040d0a901',
  'photo-1535268647677-300dbf3d78d1',
  'photo-1501286353178-1ec881214838',
  'photo-1441057206919-63d19fac2369',
];

export function BulkImportStudentsDialog({ onImportStudents }: BulkImportStudentsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      { Name: "John Doe", Class: "8th" },
      { Name: "Jane Smith", Class: "9th" },
      { Name: "Bob Johnson", Class: "10th" },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_import_template.xlsx");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please select an Excel file (.xlsx or .xls)");
      return;
    }

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setPreviewData(jsonData);
        validateData(jsonData);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error("Error reading Excel file. Please check the format.");
        setErrors(["Error reading Excel file. Please check the format."]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateData = (data: any[]) => {
    const newErrors: string[] = [];
    
    if (data.length === 0) {
      newErrors.push("Excel file is empty");
      setErrors(newErrors);
      return;
    }

    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      if (!row.Name || typeof row.Name !== 'string' || row.Name.trim() === '') {
        newErrors.push(`Row ${rowNum}: Name is required`);
      }
      
      if (!row.Class || !classNames.includes(row.Class)) {
        newErrors.push(`Row ${rowNum}: Class must be one of: ${classNames.join(', ')}`);
      }
    });

    setErrors(newErrors);
  };

  const handleImport = () => {
    if (!file || previewData.length === 0 || errors.length > 0) {
      toast.error("Please fix all errors before importing");
      return;
    }

    const studentsToImport = previewData.map(row => ({
      name: row.Name.trim(),
      class: row.Class as ClassName,
      avatar: `https://images.unsplash.com/${avatars[Math.floor(Math.random() * avatars.length)]}?w=500&h=500&fit=crop`
    }));

    onImportStudents(studentsToImport);
    
    // Reset form
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsOpen(false);
    
    toast.success(`Successfully imported ${studentsToImport.length} students!`);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple students at once. Download the template below to get started.
          </DialogDescription>
        </DialogHeader>
        
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
              Use this template to format your data correctly
            </span>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="excel-file">Upload Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Please fix the following errors:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({previewData.length} students)</Label>
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{row.Name}</td>
                        <td className="p-2">{row.Class}</td>
                      </tr>
                    ))}
                    {previewData.length > 10 && (
                      <tr className="border-t">
                        <td colSpan={2} className="p-2 text-center text-muted-foreground">
                          ... and {previewData.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!file || previewData.length === 0 || errors.length > 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import {previewData.length} Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
