import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, MessageCircle, Check, Cake } from 'lucide-react';
import { toast } from 'sonner';
import { BirthdayStudent } from '@/hooks/useBirthdayStudents';

interface BirthdayWhatsAppDialogProps {
  student: BirthdayStudent | null;
  tuitionName: string;
  onClose: () => void;
}

export function BirthdayWhatsAppDialog({
  student,
  tuitionName,
  onClose,
}: BirthdayWhatsAppDialogProps) {
  const getDefaultMessage = () => {
    if (!student) return '';
    return `Dear Parent/Guardian,

🎂 *Happy Birthday ${student.name}!* 🎉

Wishing your child a very Happy Birthday filled with joy, laughter, and wonderful memories!

${student.age ? `Turning ${student.age} years old today is a special milestone!` : ''}

On behalf of *${tuitionName}*, we wish ${student.name} a fantastic year ahead filled with success, good health, and amazing achievements!

Best wishes,
${tuitionName} 🎈`;
  };

  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Update message when student changes
  useEffect(() => {
    if (student) {
      setMessage(getDefaultMessage());
    }
  }, [student, tuitionName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Message copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const phone = student?.parentPhone || student?.phone;
    if (!phone) {
      toast.error('No phone number available for this student');
      return;
    }

    // Clean phone number - remove spaces, dashes, etc.
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Add country code if not present (assuming India +91)
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
  };

  if (!student) return null;

  return (
    <Dialog open={!!student} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Send Birthday Wishes
          </DialogTitle>
          <DialogDescription>
            Send a personalized birthday message via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-100">
            <Avatar className="h-12 w-12 ring-2 ring-pink-200">
              <AvatarImage src={student.avatar} alt={student.name} />
              <AvatarFallback className="bg-pink-100 text-pink-600">
                {student.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{student.name}</h3>
              <p className="text-sm text-muted-foreground">
                Class {student.class} {student.age && `• Turning ${student.age}`}
              </p>
              {(student.parentPhone || student.phone) && (
                <p className="text-xs text-muted-foreground">
                  📱 {student.parentPhone || student.phone}
                </p>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Birthday Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="resize-none text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1 gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Message'}
            </Button>
            <Button
              onClick={handleOpenWhatsApp}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              disabled={!student.parentPhone && !student.phone}
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp
            </Button>
          </div>

          {!student.parentPhone && !student.phone && (
            <p className="text-xs text-center text-destructive">
              ⚠️ No phone number available. Add parent phone in student details.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
