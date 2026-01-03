import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  History,
  MoreHorizontal,
  Printer,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentFee } from '@/types';
import { getStatusBadge } from './feeHelpers';

interface FeeCardProps {
  fee: StudentFee;
  studentName: string;
  studentClass: string;
  totalPaid: number;
  remaining: number;
  paymentCount: number;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onMarkAsPaid: () => void;
  onRecordPayment: () => void;
  onSendReminder: () => void;
  onViewHistory: () => void;
  onPrintReceipt?: () => void;
}

export function FeeCard({
  fee,
  studentName,
  studentClass,
  totalPaid,
  remaining,
  paymentCount,
  isSelected,
  onSelect,
  onMarkAsPaid,
  onRecordPayment,
  onSendReminder,
  onViewHistory,
  onPrintReceipt,
}: FeeCardProps) {

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with checkbox and student info */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {fee.status !== 'paid' && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  className="mt-1"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">{studentName}</h3>
                  <Badge variant="outline" className="text-xs shrink-0">{studentClass}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Due: {new Date(fee.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {fee.status !== 'paid' && (
                  <>
                    <DropdownMenuItem onClick={onMarkAsPaid}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onRecordPayment}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Record Payment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSendReminder}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Reminder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onViewHistory}>
                  <History className="h-4 w-4 mr-2" />
                  Payment History {paymentCount > 0 && `(${paymentCount})`}
                </DropdownMenuItem>
                {paymentCount > 0 && onPrintReceipt && (
                  <DropdownMenuItem onClick={onPrintReceipt}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Amount and Status */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">₹{fee.amount.toLocaleString('en-IN')}</span>
                {getStatusBadge(fee.status)}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                {totalPaid > 0 && (
                  <span className="text-green-600 font-medium">
                    Paid: ₹{totalPaid.toLocaleString('en-IN')}
                  </span>
                )}
                {remaining > 0 && totalPaid > 0 && (
                  <span className="text-yellow-600 text-xs">
                    Remaining: ₹{remaining.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions for unpaid fees */}
          {fee.status !== 'paid' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onRecordPayment}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Record Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onMarkAsPaid}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Mark Paid
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

