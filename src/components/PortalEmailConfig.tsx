import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Copy, Check, ExternalLink } from 'lucide-react';

interface PortalEmailConfigProps {
  tuitionId: string;
  currentEmail?: string | null;
  onUpdate: () => void;
}

export function PortalEmailConfig({ tuitionId, currentEmail, onUpdate }: PortalEmailConfigProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(currentEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tuitions')
        .update({ portal_email: email.trim().toLowerCase() })
        .eq('id', tuitionId);

      if (error) throw error;

      toast.success('Portal email updated successfully!');
      onUpdate();
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update portal email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/student`);
    setCopied(true);
    toast.success('Portal link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Portal Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Student Portal Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Card className="bg-indigo-50 border-indigo-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-1">
                <li>Set a shared email below (e.g., student@gmail.com)</li>
                <li>Share the portal link with students</li>
                <li>Students sign up/login with this email</li>
                <li>They select their name to view their data</li>
              </ol>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="portal-email">Shared Portal Email</Label>
            <Input
              id="portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@gmail.com"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              All students will use this email to access the portal
            </p>
          </div>

          <div className="space-y-2">
            <Label>Portal Link</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/student`}
                readOnly
                className="h-11 bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyPortalLink}
                className="h-11 w-11 shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}