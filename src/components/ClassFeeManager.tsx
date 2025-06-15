
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ClassName } from '@/types';

interface ClassFee {
  class: ClassName | 'All';
  amount: number;
}

interface ClassFeeManagerProps {
  classFees: ClassFee[];
  onUpdateClassFee: (className: string, amount: number) => void;
}

export function ClassFeeManager({ classFees, onUpdateClassFee }: ClassFeeManagerProps) {
  const [fees, setFees] = useState<ClassFee[]>([]);

  useEffect(() => {
    if (classFees) {
      setFees(classFees.filter(f => f.class !== 'All').sort((a,b) => a.class.localeCompare(b.class)));
    }
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
      toast.success(`Fee for ${className} class updated to $${fee.amount}`);
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
      <CardContent className="space-y-4">
        {fees.map(fee => (
          <div key={fee.class} className="flex items-center justify-between p-2 border rounded-md">
            <Label htmlFor={`fee-${fee.class}`} className="font-medium">{fee.class} Grade</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₹</span>
              <Input 
                id={`fee-${fee.class}`}
                type="number"
                value={fee.amount}
                onChange={(e) => handleAmountChange(fee.class, e.target.value)}
                className="w-32"
                min="0"
              />
              <Button size="sm" onClick={() => handleSave(fee.class)}>Save</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
