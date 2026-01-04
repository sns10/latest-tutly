import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeeReceipt } from "./FeeReceipt";
import { useTuitionInfo } from "@/hooks/useTuitionInfo";
import { toast } from "sonner";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { IndianRupee, Calendar, User, Printer } from "lucide-react";
import type { Student, StudentFee } from "@/types";

interface FeePayment {
  id: string;
  fee_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

interface PaymentActivityFeedProps {
  feePayments: FeePayment[];
  fees: StudentFee[];
  students: Student[];
}

type ReceiptPayment = {
  id: string;
  feeId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
};

export function PaymentActivityFeed({ feePayments, fees, students }: PaymentActivityFeedProps) {
  const { tuition } = useTuitionInfo();

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptFee, setReceiptFee] = useState<StudentFee | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<ReceiptPayment | null>(null);
  const [receiptStudentName, setReceiptStudentName] = useState<string>("");
  const [receiptStudentClass, setReceiptStudentClass] = useState<string>("");

  // Group payments by date
  const paymentsByDate = feePayments.reduce((acc, payment) => {
    const dateKey = startOfDay(new Date(payment.payment_date)).toISOString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(payment);
    return acc;
  }, {} as Record<string, FeePayment[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(paymentsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const getFeeForPayment = (payment: FeePayment) => {
    return fees.find((f) => f.id === payment.fee_id) || null;
  };

  const getStudentForPayment = (payment: FeePayment) => {
    const fee = getFeeForPayment(payment);
    if (!fee) return null;
    return students.find((s) => s.id === fee.studentId) || null;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, dd MMM yyyy");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalForDate = (payments: FeePayment[]) => {
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const handlePrintReceipt = (payment: FeePayment) => {
    const fee = getFeeForPayment(payment);
    if (!fee) {
      toast.error("Could not find the fee record for this payment");
      return;
    }

    const student = getStudentForPayment(payment);

    const normalizedPayment: ReceiptPayment = {
      id: payment.id,
      feeId: payment.fee_id,
      amount: Number(payment.amount) || 0,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method || "cash",
      paymentReference: payment.payment_reference || undefined,
      notes: payment.notes || undefined,
      createdAt: payment.created_at,
    };

    setReceiptFee(fee);
    setReceiptPayment(normalizedPayment);
    setReceiptStudentName(student?.name || "Unknown Student");
    setReceiptStudentClass(student?.class || "-");
    setReceiptOpen(true);
  };

  if (feePayments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No payment activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const payments = paymentsByDate[dateKey];
          const totalForDate = getTotalForDate(payments);

          return (
            <Card key={dateKey}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    {formatDateHeader(dateKey)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      {payments.length} payment{payments.length > 1 ? "s" : ""}
                    </Badge>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      {formatCurrency(totalForDate)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment) => {
                    const student = getStudentForPayment(payment);
                    const fee = getFeeForPayment(payment);

                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{student?.name || "Unknown Student"}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{student?.class || "N/A"}</span>
                              {fee?.feeType && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{fee.feeType}</span>
                                </>
                              )}
                              {payment.payment_method && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{payment.payment_method}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{formatCurrency(Number(payment.amount))}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at), "hh:mm a")}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePrintReceipt(payment)}
                            aria-label="Print receipt"
                            title="Print receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {receiptFee && receiptPayment && (
        <FeeReceipt
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          fee={receiptFee}
          studentName={receiptStudentName}
          studentClass={receiptStudentClass}
          payment={receiptPayment}
          tuition={tuition}
        />
      )}
    </>
  );
}
