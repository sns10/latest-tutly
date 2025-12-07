import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Student } from "@/types";
import { Mail, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface AssignStudentEmailDialogProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignEmail: (studentId: string, email: string) => Promise<boolean>;
}

export function AssignStudentEmailDialog({
  student,
  open,
  onOpenChange,
  onAssignEmail,
}: AssignStudentEmailDialogProps) {
  const [email, setEmail] = useState(student.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onAssignEmail(student.id, email.trim());
      if (success) {
        toast.success(`Email assigned to ${student.name}. They can now sign up to access the student portal.`);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error assigning email:", error);
      toast.error("Failed to assign email");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign Portal Access
          </DialogTitle>
          <DialogDescription>
            Assign an email address to <strong>{student.name}</strong> to enable student portal access. 
            The student can then sign up with this email to view their attendance, marks, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="student-email">Student Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="student-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This email will be used for the student to log into the portal.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Assigning..." : "Assign Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
