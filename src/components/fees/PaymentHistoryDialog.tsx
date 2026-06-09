import React, { useState, useEffect, useMemo } from 'react';
import { StudentFee } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, CreditCard, Banknote, Smartphone, Building, Calendar, Printer, Trash2, Pencil } from 'lucide-react';
import { FeeReceipt } from './FeeReceipt';
import { useUserTuition } from '@/hooks/useUserTuition';
import { useVoidFeePaymentMutation } from '@/hooks/queries';
import { EditPaymentDialog } from './EditPaymentDialog';

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

interface TuitionInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
}

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: StudentFee;
  studentName: string;
  studentClass?: string;
  payments: FeePayment[];
  tuition?: TuitionInfo | null;
}

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'cash':
      return <Banknote className="h-4 w-4" />;
    case 'upi':
      return <Smartphone className="h-4 w-4" />;
    case 'bank_transfer':
      return <Building className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

const formatPaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    card: 'Card',
  };
  return methods[method] || method;
};

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  fee,
  studentName,
  studentClass = '',
  payments,
  tuition,
}: PaymentHistoryDialogProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<FeePayment | null>(null);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [paymentToVoid, setPaymentToVoid] = useState<FeePayment | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<FeePayment | null>(null);

  const { tuitionId } = useUserTuition();
  const voidPaymentMut = useVoidFeePaymentMutation(tuitionId);
  
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(fee.amount) - totalPaid;

  // Keep selections in sync with live data: if a referenced payment was voided
  // (or this fee was reset) by the open Edit/Receipt/Void sub-dialog, clear
  // the stale local state and close that child so the UI doesn't show a
  // ghost row.
  const paymentIds = useMemo(() => new Set(payments.map(p => p.id)), [payments]);

  useEffect(() => {
    if (selectedPaymentForReceipt && !paymentIds.has(selectedPaymentForReceipt.id)) {
      setSelectedPaymentForReceipt(null);
      setReceiptOpen(false);
    }
    if (paymentToVoid && !paymentIds.has(paymentToVoid.id)) {
      setPaymentToVoid(null);
      setVoidConfirmOpen(false);
    }
    if (paymentToEdit && !paymentIds.has(paymentToEdit.id)) {
      setPaymentToEdit(null);
      setEditOpen(false);
    }
  }, [paymentIds, selectedPaymentForReceipt, paymentToVoid, paymentToEdit]);

  // Always feed the receipt the LIVE payment object (post-edit values), not
  // the snapshot taken when the user clicked the printer icon.
  const livePaymentForReceipt = selectedPaymentForReceipt
    ? payments.find(p => p.id === selectedPaymentForReceipt.id) || null
    : null;
  const livePaymentToEdit = paymentToEdit
    ? payments.find(p => p.id === paymentToEdit.id) || null
    : null;

  const handlePrintReceipt = (payment: FeePayment) => {
    setSelectedPaymentForReceipt(payment);
    setReceiptOpen(true);
  };

  const handleVoidClick = (payment: FeePayment) => {
    setPaymentToVoid(payment);
    setVoidConfirmOpen(true);
  };

  const handleConfirmVoid = async () => {
    if (!paymentToVoid) return;
    try {
      // Await the mutation so we only close the confirm dialog AFTER the
      // backend confirms the delete and the queries have refetched. If the
      // server rejects (RLS / tuition mismatch / payment not found), the
      // mutation throws, the error toast fires, and the dialog stays open
      // so the user sees what happened instead of a silent no-op.
      await voidPaymentMut.mutateAsync(paymentToVoid.id);
      setVoidConfirmOpen(false);
      setPaymentToVoid(null);
    } catch {
      // toast is shown by the mutation's onError; keep the dialog open.
    }
  };

  const handleEditClick = (payment: FeePayment) => {
    setPaymentToEdit(payment);
    setEditOpen(true);
  };

  const maxAmountFor = (payment: FeePayment) => {
    const otherTotal = payments
      .filter((p) => p.id !== payment.id)
      .reduce((s, p) => s + Number(p.amount), 0);
    return Number(fee.amount) - otherTotal;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Payment History
            </DialogTitle>
            <DialogDescription>
              {studentName} • {fee.feeType}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Fee Summary */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-bold">₹{fee.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-bold text-yellow-600">₹{remaining.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Payment List */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No payments recorded yet. Use “Record Payment” to add an entry and enable receipts.
                  </p>
                ) : (
                  payments.map((payment, index) => (
                    <div
                      key={payment.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <div>
                            <p className="font-semibold text-green-600">
                              +₹{payment.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatPaymentMethod(payment.paymentMethod)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintReceipt(payment)}
                            className="h-7 px-2"
                            title="Print receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(payment)}
                            className="h-7 px-2"
                            title="Edit payment"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVoidClick(payment)}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            title="Void payment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Badge variant="outline" className="text-xs">
                            #{payments.length - index}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' at '}
                        {new Date(payment.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      {payment.paymentReference && (
                        <p className="text-xs text-muted-foreground">
                          Ref: {payment.paymentReference}
                        </p>
                      )}

                      {payment.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {livePaymentForReceipt && (
        <FeeReceipt
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          fee={fee}
          studentName={studentName}
          studentClass={studentClass}
          payment={livePaymentForReceipt}
          existingPayments={payments}
          tuition={tuition || null}
        />
      )}

      {/* Void Payment Confirmation */}
      <AlertDialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the payment record and recomputes the fee status from remaining payments. This cannot be undone.
              {paymentToVoid && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  Amount: <strong>₹{paymentToVoid.amount.toLocaleString('en-IN')}</strong>
                  <br />
                  Date: {new Date(paymentToVoid.paymentDate).toLocaleDateString('en-IN')}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voidPaymentMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVoid}
              disabled={voidPaymentMut.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {voidPaymentMut.isPending ? 'Voiding...' : 'Void Payment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Payment Dialog */}
      <EditPaymentDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setPaymentToEdit(null);
        }}
        payment={livePaymentToEdit}
        maxAmount={livePaymentToEdit ? maxAmountFor(livePaymentToEdit) : 0}
      />
    </>
  );
}
