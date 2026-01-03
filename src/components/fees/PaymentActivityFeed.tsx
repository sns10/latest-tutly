import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { IndianRupee, Calendar, User } from "lucide-react";

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

interface StudentFee {
  id: string;
  studentId: string;
  amount: number;
  feeType?: string;
  status: string;
}

interface Student {
  id: string;
  name: string;
  class: string;
}

interface PaymentActivityFeedProps {
  feePayments: FeePayment[];
  fees: StudentFee[];
  students: Student[];
}

export function PaymentActivityFeed({ feePayments, fees, students }: PaymentActivityFeedProps) {
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
  const sortedDates = Object.keys(paymentsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const getStudentForPayment = (payment: FeePayment) => {
    const fee = fees.find(f => f.id === payment.fee_id);
    if (!fee || !fee.studentId) return null;
    return students.find(s => s.id === fee.studentId);
  };

  const getFeeForPayment = (payment: FeePayment) => {
    return fees.find(f => f.id === payment.fee_id);
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, dd MMM yyyy");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTotalForDate = (payments: FeePayment[]) => {
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
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
                    {payments.length} payment{payments.length > 1 ? 's' : ''}
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
                          <p className="font-medium">
                            {student?.name || 'Unknown Student'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{student?.class || 'N/A'}</span>
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
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), "hh:mm a")}
                        </p>
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
  );
}
