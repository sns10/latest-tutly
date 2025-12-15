import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Student, StudentAttendance, Subject, Faculty } from '@/types';

interface WhatsAppMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absentees: Student[];
  lateStudents: Student[];
  selectedClass: string;
  selectedDivision?: string;
  selectedDate: Date;
  subject?: Subject;
  faculty?: Faculty;
}

export function WhatsAppMessageDialog({
  open,
  onOpenChange,
  absentees,
  lateStudents,
  selectedClass,
  selectedDivision,
  selectedDate,
  subject,
  faculty,
}: WhatsAppMessageDialogProps) {
  const [copied, setCopied] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const buildMessage = () => {
    const dateStr = formatDate(selectedDate);
    const classInfo = selectedDivision 
      ? `Class ${selectedClass} - Division ${selectedDivision}`
      : `Class ${selectedClass}`;
    
    let header = `📋 *Attendance Report*\n📅 ${dateStr}\n🏫 ${classInfo}`;
    
    if (subject) {
      header += `\n📚 Subject: ${subject.name}`;
    }
    if (faculty) {
      header += `\n👨‍🏫 Faculty: ${faculty.name}`;
    }
    
    if (absentees.length === 0 && lateStudents.length === 0) {
      return `${header}\n\n✅ *All students present on time!*`;
    }
    
    let message = header;
    
    if (absentees.length > 0) {
      const absenteeList = absentees
        .map((s, idx) => `${idx + 1}. ${s.name}`)
        .join('\n');
      message += `\n\n❌ *Absent Students (${absentees.length}):*\n${absenteeList}`;
    }
    
    if (lateStudents.length > 0) {
      const lateList = lateStudents
        .map((s, idx) => `${idx + 1}. ${s.name}`)
        .join('\n');
      message += `\n\n⏰ *Late Students (${lateStudents.length}):*\n${lateList}`;
    }
    
    message += '\n\n_Please ensure regular and punctual attendance._';
    
    return message;
  };

  const message = buildMessage();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy message');
    }
  };

  const handleOpenWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message);
    // Opens WhatsApp with prefilled message (user pastes into group)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto bg-white max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Group Message Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Message Preview - Scrollable */}
          <Card className="bg-slate-50 border-slate-200 flex-1 overflow-hidden">
            <CardContent className="p-3 h-full max-h-[40vh] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                {message}
              </pre>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full h-11 gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Message
                </>
              )}
            </Button>

            <Button
              onClick={handleOpenWhatsApp}
              className="w-full h-11 gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center shrink-0">
            Copy the message and paste it into your class WhatsApp group
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
