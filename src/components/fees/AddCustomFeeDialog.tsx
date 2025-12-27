import React, { useState, useMemo } from 'react';
import { Student } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeString, validatePaymentAmount } from '@/lib/validation';

// Validation constants
const MAX_AMOUNT = 10000000;
const MAX_CUSTOM_FEE_TYPE_LENGTH = 100;
const MAX_NOTES_LENGTH = 500;

interface AddCustomFeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  onAddFee: (fee: {
    studentId: string;
    feeType: string;
    amount: number;
    dueDate: string;
    status: 'unpaid';
    notes?: string;
  }) => void;
}

const FEE_TYPES = [
  'Monthly Fee',
  'Admission Fee',
  'Exam Fee',
  'Lab Fee',
  'Transport Fee',
  'Books & Materials',
  'Extra Classes',
  'Competition Fee',
  'Custom'
];

export function AddCustomFeeDialog({
  open,
  onOpenChange,
  students,
  onAddFee
}: AddCustomFeeDialogProps) {
  const [applyToClass, setApplyToClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [feeType, setFeeType] = useState('');
  const [customFeeType, setCustomFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Get unique classes from students
  const availableClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.class));
    return Array.from(classes).sort();
  }, [students]);

  // Get students for selected class
  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.class === selectedClass);
  }, [students, selectedClass]);

  const handleSubmit = async () => {
    // Validate fee type
    const finalFeeType = feeType === 'Custom' ? sanitizeString(customFeeType) : feeType;
    if (!finalFeeType) {
      toast.error('Please select or enter fee type');
      return;
    }

    if (feeType === 'Custom' && customFeeType.length > MAX_CUSTOM_FEE_TYPE_LENGTH) {
      toast.error(`Custom fee type cannot exceed ${MAX_CUSTOM_FEE_TYPE_LENGTH} characters`);
      return;
    }

    // Validate amount
    const amountValidation = validatePaymentAmount(amount, MAX_AMOUNT);
    if (!amountValidation.valid) {
      toast.error(amountValidation.error);
      return;
    }
    const feeAmount = parseFloat(amount);

    // Validate due date
    if (!dueDate) {
      toast.error('Please select a due date');
      return;
    }

    // Validate notes length
    if (notes.length > MAX_NOTES_LENGTH) {
      toast.error(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`);
      return;
    }

    if (applyToClass) {
      if (!selectedClass) {
        toast.error('Please select a class');
        return;
      }

      // Apply fee to all students in the class
      const classStudents = students.filter(s => s.class === selectedClass);
      if (classStudents.length === 0) {
        toast.error('No students found in this class');
        return;
      }

      for (const student of classStudents) {
        await onAddFee({
          studentId: student.id,
          feeType: finalFeeType,
          amount: feeAmount,
          dueDate,
          status: 'unpaid',
          notes: notes ? sanitizeString(notes) : undefined
        });
      }

      toast.success(`Fee added for ${classStudents.length} students in ${selectedClass}`);
    } else {
      if (!selectedStudent) {
        toast.error('Please select a student');
        return;
      }

      onAddFee({
        studentId: selectedStudent,
        feeType: finalFeeType,
        amount: feeAmount,
        dueDate,
        status: 'unpaid',
        notes: notes ? sanitizeString(notes) : undefined
      });

      toast.success('Custom fee added successfully');
    }

    // Reset form
    setApplyToClass(false);
    setSelectedClass('');
    setSelectedStudent('');
    setFeeType('');
    setCustomFeeType('');
    setAmount('');
    setDueDate('');
    setNotes('');
    onOpenChange(false);
  };

  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 1 week from now
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Add Custom Fee
          </DialogTitle>
          <DialogDescription>
            Add a custom fee for a student or entire class
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Apply to Class Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="applyToClass" className="text-sm font-medium">
                Apply to entire class
              </Label>
            </div>
            <Switch
              id="applyToClass"
              checked={applyToClass}
              onCheckedChange={(checked) => {
                setApplyToClass(checked);
                setSelectedStudent('');
                setSelectedClass('');
              }}
            />
          </div>

          {applyToClass ? (
            /* Class Selection */
            <div className="space-y-2">
              <Label htmlFor="class">Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(cls => (
                    <SelectItem key={cls} value={cls}>
                      {cls} ({students.filter(s => s.class === cls).length} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClass && (
                <p className="text-xs text-muted-foreground">
                  Fee will be added to {studentsInClass.length} students
                </p>
              )}
            </div>
          ) : (
            /* Student Selection */
            <div className="space-y-2">
              <Label htmlFor="student">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} - {student.class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fee Type */}
          <div className="space-y-2">
            <Label htmlFor="feeType">Fee Type</Label>
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger>
                <SelectValue placeholder="Select fee type" />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Fee Type Input */}
          {feeType === 'Custom' && (
            <div className="space-y-2">
              <Label htmlFor="customFeeType">Custom Fee Name</Label>
              <Input
                id="customFeeType"
                value={customFeeType}
                onChange={(e) => setCustomFeeType(e.target.value.slice(0, MAX_CUSTOM_FEE_TYPE_LENGTH))}
                placeholder="Enter fee name..."
                maxLength={MAX_CUSTOM_FEE_TYPE_LENGTH}
              />
              <p className="text-xs text-muted-foreground">{customFeeType.length}/{MAX_CUSTOM_FEE_TYPE_LENGTH}</p>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = sanitized.split('.');
                  const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
                  setAmount(cleaned.slice(0, 12));
                }}
                placeholder="0"
                className="pl-7"
                maxLength={12}
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate || getDefaultDueDate()}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
              placeholder="Any additional notes..."
              rows={2}
              maxLength={MAX_NOTES_LENGTH}
            />
            <p className="text-xs text-muted-foreground">{notes.length}/{MAX_NOTES_LENGTH}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {applyToClass ? `Add Fee to Class` : 'Add Fee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
