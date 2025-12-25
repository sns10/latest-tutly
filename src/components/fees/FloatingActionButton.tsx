import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, Plus, CheckCircle, MessageSquare } from 'lucide-react';

interface FloatingActionButtonProps {
  onRecordPayment: () => void;
  onMarkAsPaid?: () => void;
  onSendReminder?: () => void;
  onGenerateFees?: () => void;
  showGenerateFees?: boolean;
}

export function FloatingActionButton({
  onRecordPayment,
  onMarkAsPaid,
  onSendReminder,
  onGenerateFees,
  showGenerateFees = false,
}: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            aria-label="Quick fee actions"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 mb-2">
          <DropdownMenuItem onClick={onRecordPayment}>
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </DropdownMenuItem>
          {onMarkAsPaid && (
            <DropdownMenuItem onClick={onMarkAsPaid}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Paid
            </DropdownMenuItem>
          )}
          {onSendReminder && (
            <DropdownMenuItem onClick={onSendReminder}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Reminder
            </DropdownMenuItem>
          )}
          {showGenerateFees && onGenerateFees && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onGenerateFees}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Fees
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

