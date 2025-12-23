import React, { useState, useMemo } from 'react';
import { Student, StudentFee } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  unpaidFees: StudentFee[];
}

export function WhatsAppReminderDialog({
  open,
  onOpenChange,
  student,
  unpaidFees
}: WhatsAppReminderDialogProps) {
  const totalUnpaid = unpaidFees.reduce((sum, f) => sum + f.amount, 0);
  
  const defaultMessage = useMemo(() => {
    const feeDetails = unpaidFees.map(f => 
      `• ${f.feeType || 'Monthly Fee'}: ₹${f.amount.toLocaleString('en-IN')} (Due: ${new Date(f.dueDate).toLocaleDateString()})`
    ).join('\n');

    return `Dear Parent,

This is a friendly reminder regarding the pending fee payment for *${student.name}* (Class: ${student.class}).

*Pending Fees:*
${feeDetails}

*Total Outstanding: ₹${totalUnpaid.toLocaleString('en-IN')}*

Please arrange for the payment at your earliest convenience to avoid any late fee charges.

Thank you for your cooperation.

Best regards,
Tuition Administration`;
  }, [student, unpaidFees, totalUnpaid]);

  const [message, setMessage] = useState(defaultMessage);

  const handleSendWhatsApp = () => {
    // Note: WhatsApp API requires phone number. Since we don't have parent phone in current schema,
    // we'll open WhatsApp with the message ready to send
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    toast.success('WhatsApp opened with reminder message');
    onOpenChange(false);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Send Fee Reminder
          </DialogTitle>
          <DialogDescription>
            Send a WhatsApp reminder to {student.name}'s parent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{student.name}</p>
                <p className="text-sm text-muted-foreground">{student.class}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{unpaidFees.length} unpaid fees</p>
                <p className="font-bold text-red-600">₹{totalUnpaid.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message Preview</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              You can edit this message before sending
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCopyMessage} className="w-full sm:w-auto">
            <Copy className="h-4 w-4 mr-2" />
            Copy Message
          </Button>
          <Button onClick={handleSendWhatsApp} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
