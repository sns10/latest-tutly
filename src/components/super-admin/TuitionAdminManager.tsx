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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Calendar, Building2, Trash2, RefreshCw, Edit2, Check, X } from 'lucide-react';
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
    id: string;
    name: string;
  } | null;
}

interface Tuition {
  id: string;
  name: string;
}

interface TuitionAdminManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TuitionAdminManager({ open, onOpenChange }: TuitionAdminManagerProps) {
  const [admins, setAdmins] = useState<TuitionAdmin[]>([]);
  const [tuitions, setTuitions] = useState<Tuition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTuitionId, setSelectedTuitionId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchAdmins();
      fetchTuitions();
    }
  }, [open]);

  const fetchTuitions = async () => {
    try {
      const { data, error } = await supabase
        .from('tuitions')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setTuitions(data || []);
    } catch (error) {
      console.error('Error fetching tuitions:', error);
    }
  };

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
                  .select('id, name')
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
      await supabase
        .from('profiles')
        .update({ tuition_id: null })
        .eq('id', userId);

      toast.success('Admin role removed');
      fetchAdmins();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error(error.message || 'Failed to remove admin');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (admin: TuitionAdmin) => {
    setEditingId(admin.id);
    setSelectedTuitionId(admin.tuition_id || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedTuitionId('');
  };

  const handleSaveEdit = async (admin: TuitionAdmin) => {
    if (!selectedTuitionId) {
      toast.error('Please select a tuition center');
      return;
    }

    try {
      // Update user_roles tuition_id
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ tuition_id: selectedTuitionId })
        .eq('id', admin.id);

      if (roleError) throw roleError;

      // Update profile tuition_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tuition_id: selectedTuitionId })
        .eq('id', admin.user_id);

      if (profileError) throw profileError;

      toast.success('Tuition assignment updated');
      setEditingId(null);
      setSelectedTuitionId('');
      fetchAdmins();
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast.error(error.message || 'Failed to update assignment');
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

        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={fetchAdmins} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[450px] pr-4">
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
              <p className="text-sm mt-2">Create a tuition center to add admins</p>
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <Card key={admin.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {admin.profile?.full_name || 'Unknown User'}
                          </h4>
                          <Badge variant="secondary">Tuition Admin</Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {editingId === admin.id ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5" />
                              <Select
                                value={selectedTuitionId}
                                onValueChange={setSelectedTuitionId}
                              >
                                <SelectTrigger className="w-[200px] h-8">
                                  <SelectValue placeholder="Select tuition" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tuitions.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600"
                                onClick={() => handleSaveEdit(admin)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              {admin.tuition ? (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3.5 w-3.5" />
                                  {admin.tuition.name}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <Building2 className="h-3.5 w-3.5" />
                                  No tuition assigned
                                </span>
                              )}
                            </>
                          )}
                          {admin.profile?.phone && (
                            <span className="flex items-center gap-1">
                              📞 {admin.profile.phone}
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

                      <div className="flex items-center gap-1">
                        {editingId !== admin.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(admin)}
                            title="Change tuition assignment"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}

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