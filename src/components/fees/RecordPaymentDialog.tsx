import React, { useState, useEffect } from 'react';
import { StudentFee } from '@/types';
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
import { CreditCard, Banknote, Smartphone, Building } from 'lucide-react';
import { toast } from 'sonner';

interface FeePayment {
  id: string;
  feeId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: StudentFee;
  studentName: string;
  existingPayments?: FeePayment[];
  onRecordPayment: (amount: number, paymentMethod: string, reference?: string, notes?: string) => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
  { value: 'cheque', label: 'Cheque', icon: CreditCard },
  { value: 'card', label: 'Card', icon: CreditCard },
];

export function RecordPaymentDialog({
  open,
  onOpenChange,
  fee,
  studentName,
  existingPayments = [],
  onRecordPayment
}: RecordPaymentDialogProps) {
  const alreadyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = fee.amount - alreadyPaid;
  
  const [amount, setAmount] = useState(remainingDue.toString());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Reset amount when dialog opens or fee changes
  useEffect(() => {
    if (open) {
      const remaining = fee.amount - existingPayments.reduce((sum, p) => sum + p.amount, 0);
      setAmount(remaining > 0 ? remaining.toString() : '0');
      setPaymentMethod('cash');
      setReference('');
      setNotes('');
    }
  }, [open, fee, existingPayments]);

  const handleSubmit = () => {
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentAmount > remainingDue) {
      toast.error(`Payment amount cannot exceed remaining due amount (₹${remainingDue.toLocaleString('en-IN')})`);
      return;
    }

    onRecordPayment(paymentAmount, paymentMethod, reference || undefined, notes || undefined);
    onOpenChange(false);
  };

  const isPartial = parseFloat(amount || '0') > 0 && parseFloat(amount || '0') < remainingDue;
  const newRemaining = remainingDue - parseFloat(amount || '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Recording payment for {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Fee Summary */}
          <div className="p-3 sm:p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Fee Type</span>
              <span className="font-medium truncate ml-2">{fee.feeType}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold">₹{fee.amount.toLocaleString('en-IN')}</span>
            </div>
            {alreadyPaid > 0 && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium text-green-600">₹{alreadyPaid.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Remaining Due</span>
              <span className="font-bold text-yellow-600">₹{remainingDue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Due Date</span>
              <span>{new Date(fee.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                max={remainingDue}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setAmount(remainingDue.toString())}
              >
                Full Amount
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setAmount((remainingDue / 2).toString())}
              >
                Half
              </Button>
            </div>
            {isPartial && (
              <p className="text-xs text-yellow-600">
                Partial payment. After this: ₹{newRemaining.toLocaleString('en-IN')} remaining
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-sm">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              {PAYMENT_METHODS.slice(0, 3).map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    type="button"
                    variant={paymentMethod === method.value ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-2.5"
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <Icon className="h-3.5 w-3.5 mb-1" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                );
              })}
            </div>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          {(paymentMethod === 'upi' || paymentMethod === 'bank_transfer' || paymentMethod === 'cheque') && (
            <div className="space-y-2">
              <Label htmlFor="reference">
                {paymentMethod === 'cheque' ? 'Cheque Number' : 'Transaction Reference'}
              </Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={paymentMethod === 'cheque' ? 'Enter cheque number' : 'Enter transaction ID'}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs sm:text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={remainingDue <= 0} className="text-xs sm:text-sm">
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
