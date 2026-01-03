import React, { useState } from 'react';
import { StudentFee } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, CreditCard, Banknote, Smartphone, Building, Calendar, Printer } from 'lucide-react';
import { FeeReceipt } from './FeeReceipt';

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
  
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(fee.amount) - totalPaid;

  const handlePrintReceipt = (payment: FeePayment) => {
    setSelectedPaymentForReceipt(payment);
    setReceiptOpen(true);
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
                    No payments recorded yet
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
                          >
                            <Printer className="h-3.5 w-3.5" />
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
      {selectedPaymentForReceipt && (
        <FeeReceipt
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          fee={fee}
          studentName={studentName}
          studentClass={studentClass}
          payment={selectedPaymentForReceipt}
          tuition={tuition || null}
        />
      )}
    </>
  );
}
