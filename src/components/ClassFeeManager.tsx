import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ClassName, ClassFee, Student } from '@/types';

const ALL_CLASSES: ClassName[] = ['8th', '9th', '10th', '11th', '12th'];

interface ClassFeeManagerProps {
  classFees: ClassFee[];
  students?: Student[];
  onUpdateClassFee: (className: string, amount: number) => void;
}

export function ClassFeeManager({ classFees, students = [], onUpdateClassFee }: ClassFeeManagerProps) {
  const [fees, setFees] = useState<ClassFee[]>([]);

  useEffect(() => {
    // Always show all classes for fee configuration, regardless of whether students exist
    const mergedFees: ClassFee[] = ALL_CLASSES.map(className => {
      const existingFee = classFees.find(f => f.class === className);
      return existingFee || { class: className, amount: 0 };
    });
    
    setFees(mergedFees.sort((a, b) => a.class.localeCompare(b.class)));
  }, [classFees]);

  const handleAmountChange = (className: string, newAmount: string) => {
    const amount = newAmount === '' ? 0 : parseFloat(newAmount);
    if (!isNaN(amount)) {
      setFees(fees.map(fee => fee.class === className ? { ...fee, amount } : fee));
    }
  };

  const handleSave = (className: string) => {
    const fee = fees.find(f => f.class === className);
    if (fee && fee.amount >= 0) {
      onUpdateClassFee(className, fee.amount);
      toast.success(`Fee for ${className} class updated to ₹${fee.amount}`);
    } else {
      toast.error("Invalid fee amount.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Class Fees</CardTitle>
        <CardDescription>Define the monthly tuition fee for each class.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-6">
        {fees.length === 0 ? (
          <p className="text-muted-foreground text-sm">No classes found. Add students to see class fee options.</p>
        ) : (
          fees.map(fee => (
            <div key={fee.class} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2 sm:p-3 border rounded-md">
              <Label htmlFor={`fee-${fee.class}`} className="font-medium text-sm sm:text-base">{fee.class} Grade</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">₹</span>
                <Input 
                  id={`fee-${fee.class}`}
                  type="number"
                  value={fee.amount}
                  onChange={(e) => handleAmountChange(fee.class, e.target.value)}
                  className="w-full sm:w-32 text-sm"
                  min="0"
                />
                <Button size="sm" onClick={() => handleSave(fee.class)} className="shrink-0 text-xs sm:text-sm">Save</Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
