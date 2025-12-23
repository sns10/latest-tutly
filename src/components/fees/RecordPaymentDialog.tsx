import React, { useState } from 'react';
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

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: StudentFee;
  studentName: string;
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
  onRecordPayment
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState(fee.amount.toString());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isPartial, setIsPartial] = useState(false);

  const handleSubmit = () => {
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentAmount > fee.amount) {
      toast.error('Payment amount cannot exceed fee amount');
      return;
    }

    onRecordPayment(paymentAmount, paymentMethod, reference || undefined, notes || undefined);
    toast.success(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded`);
    
    // Reset form
    setAmount(fee.amount.toString());
    setPaymentMethod('cash');
    setReference('');
    setNotes('');
    setIsPartial(false);
  };

  const remainingAmount = fee.amount - parseFloat(amount || '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Recording payment for {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fee Summary */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee Type</span>
              <span className="font-medium">{fee.feeType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold">₹{fee.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
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
                onChange={(e) => {
                  setAmount(e.target.value);
                  setIsPartial(parseFloat(e.target.value) < fee.amount);
                }}
                className="pl-7"
                max={fee.amount}
              />
            </div>
            {isPartial && parseFloat(amount) > 0 && (
              <p className="text-xs text-yellow-600">
                Partial payment. Remaining: ₹{remainingAmount.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.slice(0, 3).map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    type="button"
                    variant={paymentMethod === method.value ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-3"
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                );
              })}
            </div>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
