import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Users, Mail, Calendar, Building2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TuitionAdmin {
  id: string;
  user_id: string;
  role: string;
  tuition_id: string | null;
  created_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
  tuition: {
    name: string;
  } | null;
}

interface TuitionAdminManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TuitionAdminManager({ open, onOpenChange }: TuitionAdminManagerProps) {
  const [admins, setAdmins] = useState<TuitionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAdmins();
    }
  }, [open]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      // First get all tuition_admin roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, tuition_id, created_at')
        .eq('role', 'tuition_admin')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Get profiles and tuitions for each admin
      const adminsWithDetails = await Promise.all(
        (rolesData || []).map(async (role) => {
          const [profileResult, tuitionResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('id', role.user_id)
              .maybeSingle(),
            role.tuition_id
              ? supabase
                  .from('tuitions')
                  .select('name')
                  .eq('id', role.tuition_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...role,
            profile: profileResult.data,
            tuition: tuitionResult.data,
          };
        })
      );

      setAdmins(adminsWithDetails);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load tuition admins');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, userId: string) => {
    setDeletingId(adminId);
    try {
      // Remove the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminId);

      if (roleError) throw roleError;

      // Clear tuition_id from profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tuition_id: null })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      toast.success('Admin role removed');
      fetchAdmins();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error(error.message || 'Failed to remove admin');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tuition Admin Accounts
          </DialogTitle>
          <DialogDescription>
            View and manage all tuition admin user accounts across the platform
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tuition admins found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <Card key={admin.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {admin.profile?.full_name || 'Unknown User'}
                          </h4>
                          <Badge variant="secondary">Tuition Admin</Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {admin.tuition && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {admin.tuition.name}
                            </span>
                          )}
                          {admin.profile?.phone && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {admin.profile.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Added {format(new Date(admin.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          User ID: {admin.user_id.slice(0, 8)}...
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingId === admin.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Admin Role?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the tuition admin role from{' '}
                              <strong>{admin.profile?.full_name || 'this user'}</strong>.
                              They will lose access to manage their tuition center.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Role
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {admins.length} tuition admin{admins.length !== 1 ? 's' : ''} total
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}