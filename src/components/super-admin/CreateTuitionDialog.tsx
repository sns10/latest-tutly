import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateTuitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTuitionDialog({ open, onOpenChange, onSuccess }: CreateTuitionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create tuition center
      const { data: tuitionData, error: tuitionError } = await supabase
        .from('tuitions')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          is_active: true,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (tuitionError) throw tuitionError;

      // 2. Call edge function to set up admin (handles both new and existing users)
      try {
        const { data: setupData, error: setupError } = await supabase.functions.invoke('setup-tuition-admin', {
          body: {
            adminEmail: formData.adminEmail,
            adminPassword: formData.adminPassword,
            adminName: formData.adminName,
            tuitionId: tuitionData.id,
          },
        });

        if (setupError) {
          console.error('Setup error:', setupError);
          toast.warning(`Tuition created but admin setup failed: ${setupError.message || 'Unknown error'}. You may need to manually assign the admin.`);
        } else if (setupData?.error) {
          console.error('Setup response error:', setupData.error);
          toast.warning(`Tuition created. Admin setup issue: ${setupData.error}`);
        } else {
          const message = setupData?.isNewUser 
            ? 'Tuition center and admin account created successfully!'
            : 'Tuition center created and existing user assigned as admin!';
          toast.success(message);
        }
      } catch (invokeError: any) {
        console.error('Function invoke error:', invokeError);
        toast.warning(`Tuition created but admin setup failed: ${invokeError.message || 'Function invocation error'}. You may need to manually assign the admin.`);
      }

      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        adminEmail: '',
        adminPassword: '',
        adminName: '',
      });
    } catch (error: any) {
      console.error('Error creating tuition:', error);
      toast.error(error.message || 'Failed to create tuition center');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tuition Center</DialogTitle>
          <DialogDescription>
            Set up a new tuition center and create an admin account
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Tuition Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-foreground">Tuition Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Tuition Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ABC Tuition Center"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@tuition.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 1234567890"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address, city, state"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Admin Account */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm text-foreground">Admin Account</h3>
              <p className="text-xs text-muted-foreground">
                If the email already exists, the user will be assigned as admin. Otherwise, a new account will be created.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="adminName">Admin Name *</Label>
                  <Input
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@tuition.com"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="adminPassword">Admin Password (for new users)</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    placeholder="Minimum 6 characters (leave empty if user exists)"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required only if creating a new user account
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Tuition
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}