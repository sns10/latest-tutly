import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from '@/hooks/useUserTuition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw, Shield, Clock, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BackupStats {
  studentsCount: number;
  attendanceRecords: number;
  feeRecords: number;
  testsCount: number;
  subjectsCount: number;
  facultyCount: number;
}

interface BackupRecord {
  id: string;
  created_at: string;
  file_size: number;
  status: string;
}

export function BackupDashboard() {
  const { tuitionId } = useUserTuition();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [lastBackupStats, setLastBackupStats] = useState<BackupStats | null>(null);

  const fetchBackups = async () => {
    if (!tuitionId) return;
    
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId, action: 'list' },
      });

      if (response.data?.backups) {
        setBackups(response.data.backups);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [tuitionId]);

  const handleCreateBackup = async () => {
    if (!tuitionId) return;

    setCreating(true);
    try {
      const response = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId, action: 'create' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success('Backup created successfully!');
        if (response.data.stats) {
          setLastBackupStats(response.data.stats);
        }
        fetchBackups();
      } else {
        throw new Error(response.data?.error || 'Failed to create backup');
      }
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error(error.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    if (!tuitionId) return;

    try {
      const response = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId, action: 'download', backupId },
      });

      if (response.data?.backup) {
        const blob = new Blob([JSON.stringify(response.data.backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${backupId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Backup downloaded!');
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Data Backup & Recovery
            </CardTitle>
            <CardDescription>
              Secure your tuition data with automated backups
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchBackups}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={handleCreateBackup}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Create Backup
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Section */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Status</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-green-900">Protected</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Database className="h-4 w-4" />
              <span className="text-xs font-medium">Total Backups</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-blue-900">{backups.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-2 text-purple-700">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Last Backup</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-purple-900">
              {backups.length > 0 
                ? format(new Date(backups[0].created_at), 'MMM d, h:mm a')
                : 'Never'}
            </p>
          </div>
          {lastBackupStats && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <div className="flex items-center gap-2 text-orange-700">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-medium">Records</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-orange-900">
                {lastBackupStats.studentsCount} students
              </p>
            </div>
          )}
        </div>

        {/* Backups List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Recent Backups</h4>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No backups yet</p>
              <p className="text-xs mt-1">Create your first backup to protect your data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div 
                  key={backup.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(backup.created_at), 'MMM d, yyyy - h:mm a')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(backup.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                      {backup.status}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDownloadBackup(backup.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">What's included in backups:</p>
              <p className="mt-1">
                Students, attendance records, fees, test results, subjects, faculty, divisions, 
                homework, announcements, timetable, and room data.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
