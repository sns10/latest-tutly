import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserTuition } from '@/hooks/useUserTuition';
import { useEditFeePaymentMutation } from '@/hooks/queries';
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

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: FeePayment | null;
  /** Max allowed amount for this payment (= fee.amount - other payments) */
  maxAmount: number;
}

export function EditPaymentDialog({
  open,
  onOpenChange,
  payment,
  maxAmount,
}: EditPaymentDialogProps) {
  const { tuitionId } = useUserTuition();
  const editMut = useEditFeePaymentMutation(tuitionId);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  useEffect(() => {
    if (payment && open) {
      setAmount(String(payment.amount));
      setMethod(payment.paymentMethod || 'cash');
      setReference(payment.paymentReference || '');
      setNotes(payment.notes || '');
      setPaymentDate(payment.paymentDate);
    }
  }, [payment, open]);

  const handleSave = async () => {
    if (!payment) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    if (amt > maxAmount) {
      toast.error(`Amount cannot exceed ₹${maxAmount.toLocaleString('en-IN')}`);
      return;
    }
    try {
      await editMut.mutateAsync({
        paymentId: payment.id,
        amount: amt,
        paymentMethod: method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        paymentDate,
      });
      onOpenChange(false);
    } catch {
      /* handled in mutation */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Fix mistakes in this payment. The fee status will be recomputed automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-pay-amount">Amount (₹)</Label>
            <Input
              id="edit-pay-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              max={maxAmount}
            />
            <p className="text-xs text-muted-foreground">
              Max allowed: ₹{maxAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-pay-date">Payment Date</Label>
            <Input
              id="edit-pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-pay-ref">Reference (optional)</Label>
            <Input
              id="edit-pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Cheque #, UPI txn id, etc."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-pay-notes">Notes (optional)</Label>
            <Textarea
              id="edit-pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={editMut.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={editMut.isPending}>
            {editMut.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}