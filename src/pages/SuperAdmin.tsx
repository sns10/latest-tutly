import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Plus, 
  Settings, 
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { CreateTuitionDialog } from '@/components/super-admin/CreateTuitionDialog';
import { TuitionsList } from '@/components/super-admin/TuitionsList';
import { SuperAdminStats } from '@/components/super-admin/SuperAdminStats';

export default function SuperAdmin() {
  const { signOut } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tuitions, setTuitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTuitions();
  }, []);

  const fetchTuitions = async () => {
    try {
      const { data, error } = await supabase
        .from('tuitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTuitions(data || []);
    } catch (error) {
      console.error('Error fetching tuitions:', error);
      toast.error('Failed to load tuitions');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Platform Admin</h1>
                <p className="text-xs text-slate-500">Multi-Tenant Management</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <SuperAdminStats tuitions={tuitions} />

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Tuition Centers</h2>
            <p className="text-sm text-slate-600 mt-1">
              Manage all registered tuition centers and their subscriptions
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="lg" className="shadow-md">
            <Plus className="h-5 w-5 mr-2" />
            Create Tuition
          </Button>
        </div>

        {/* Tuitions List */}
        <TuitionsList 
          tuitions={tuitions} 
          loading={loading}
          onRefresh={fetchTuitions}
        />
      </main>

      {/* Create Tuition Dialog */}
      <CreateTuitionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchTuitions}
      />
    </div>
  );
}
