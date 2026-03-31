import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from '@/hooks/useUserTuition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Download, RefreshCw, Shield, Clock, Database, CheckCircle2, AlertCircle, Upload, RotateCcw, CalendarX2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BackupStats {
  studentsCount: number;
  attendanceRecords: number;
  feeRecords: number;
  testsCount: number;
  subjectsCount: number;
  facultyCount: number;
  divisionsCount?: number;
  roomsCount?: number;
  homeworkCount?: number;
  announcementsCount?: number;
  challengesCount?: number;
  termExamsCount?: number;
  timetableCount?: number;
}

interface BackupRecord {
  id: string;
  created_at: string;
  file_size: number;
  status: string;
}

interface RestoreResult {
  success: boolean;
  count: number;
  error?: string;
}

export function BackupDashboard() {
  const { tuitionId } = useUserTuition();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [lastBackupStats, setLastBackupStats] = useState<BackupStats | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [restoreResults, setRestoreResults] = useState<Record<string, RestoreResult> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'keep_structure' | 'full_reset'>('keep_structure');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetResults, setResetResults] = useState<Record<string, number> | null>(null);

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

  const handleRestoreFromBackup = async (backupId: string) => {
    setSelectedBackupId(backupId);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = async () => {
    if (!tuitionId || !selectedBackupId) return;

    setRestoring(true);
    setRestoreDialogOpen(false);
    
    try {
      const response = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId, action: 'restore', backupId: selectedBackupId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success(response.data.message || 'Data restored successfully!');
        setRestoreResults(response.data.results);
      } else {
        throw new Error(response.data?.error || 'Failed to restore backup');
      }
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      toast.error(error.message || 'Failed to restore backup');
    } finally {
      setRestoring(false);
      setSelectedBackupId(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tuitionId) return;

    setRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData?.data || !backupData?.metadata) {
        throw new Error('Invalid backup file format');
      }

      const response = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId, action: 'restore', backupData },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success(response.data.message || 'Data restored from file!');
        setRestoreResults(response.data.results);
      } else {
        throw new Error(response.data?.error || 'Failed to restore from file');
      }
    } catch (error: any) {
      console.error('Error restoring from file:', error);
      toast.error(error.message || 'Failed to restore from file');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReset = async () => {
    if (!tuitionId || resetConfirmText !== 'RESET') return;

    setResetting(true);
    setResetDialogOpen(false);
    setResetConfirmText('');

    try {
      const response = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId, action: 'reset', resetMode: resetMode },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success(response.data.message || 'Academic year reset completed!');
        setResetResults(response.data.deletionLog);
        fetchBackups(); // Refresh to show the pre-reset backup
      } else {
        throw new Error(response.data?.error || 'Failed to reset data');
      }
    } catch (error: any) {
      console.error('Error resetting data:', error);
      toast.error(error.message || 'Failed to reset data');
    } finally {
      setResetting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Data Backup & Recovery
              </CardTitle>
              <CardDescription>
                Secure your tuition data with automated backups
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
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
                variant="outline"
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
              >
                {restoring ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Restore from File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
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

          {/* Restore Results */}
          {restoreResults && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Restore Results</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(restoreResults).map(([key, result]) => (
                  <div key={key} className={`p-2 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <span className="font-medium capitalize">{key}:</span> {result.count} records
                    {result.error && <p className="text-red-600 text-xs">{result.error}</p>}
                  </div>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => setRestoreResults(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Reset Results */}
          {resetResults && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <h4 className="text-sm font-medium text-amber-900 mb-2">Reset Results — Records Deleted</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(resetResults).filter(([, count]) => count > 0).map(([key, count]) => (
                  <div key={key} className="p-2 rounded bg-amber-100">
                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {count}
                  </div>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => setResetResults(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

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
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(backup.file_size)}
                          </p>
                          {backup.status === 'pre_reset_backup' && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pre-reset</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={backup.status === 'completed' || backup.status === 'pre_reset_backup' ? 'default' : 'secondary'}>
                        {backup.status === 'pre_reset_backup' ? 'backup' : backup.status}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRestoreFromBackup(backup.id)}
                        disabled={restoring}
                        title="Restore this backup"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadBackup(backup.id)}
                        title="Download backup"
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
                <p className="font-medium">Complete Data Backup includes:</p>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-1">
                  <span>• Students</span>
                  <span>• Attendance</span>
                  <span>• Fees & Payments</span>
                  <span>• Tests & Results</span>
                  <span>• Term Exams</span>
                  <span>• Subjects</span>
                  <span>• Faculty</span>
                  <span>• Divisions</span>
                  <span>• Timetable</span>
                  <span>• Rooms</span>
                  <span>• Homework</span>
                  <span>• Announcements</span>
                  <span>• Challenges</span>
                  <span>• XP & Badges</span>
                  <span>• Rewards</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Academic Year Reset Card */}
      <Card className="border-red-200 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <CalendarX2 className="h-5 w-5" />
            New Academic Year — Reset Data
          </CardTitle>
          <CardDescription>
            Clear all transactional data to start a fresh academic year. A backup is automatically created before any data is deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-green-200 bg-green-50">
              <h4 className="text-sm font-semibold text-green-800">Keep Students & Structure</h4>
              <p className="text-xs text-green-700 mt-1">
                Keeps students, subjects, faculty, divisions, rooms, and class fee config. 
                Clears attendance, tests, marks, fees, XP, badges, homework, announcements, challenges, timetable, and term exams.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-red-200 bg-red-50">
              <h4 className="text-sm font-semibold text-red-800">Complete Fresh Start</h4>
              <p className="text-xs text-red-700 mt-1">
                Deletes everything including students. Only the tuition center record, subjects, faculty, divisions, rooms, and fee config remain.
              </p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setResetDialogOpen(true)}
            disabled={resetting}
            className="w-full sm:w-auto"
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {resetting ? 'Resetting...' : 'Start New Academic Year'}
          </Button>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore data from the selected backup. Existing records with matching IDs will be overwritten. 
              New records from the backup will be added. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Academic Year Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={(open) => {
        setResetDialogOpen(open);
        if (!open) {
          setResetConfirmText('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Academic Year Reset
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will permanently delete transactional data. A backup will be created automatically before deletion.</p>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Reset Mode</label>
                  <Select value={resetMode} onValueChange={(v) => setResetMode(v as 'keep_structure' | 'full_reset')}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep_structure">Keep Students & Structure</SelectItem>
                      <SelectItem value="full_reset">Complete Fresh Start</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {resetMode === 'full_reset' && (
                  <div className="p-2 rounded bg-red-100 border border-red-300 text-red-800 text-xs">
                    ⚠️ This will also delete ALL student records permanently.
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Type <span className="font-mono bg-muted px-1 rounded">RESET</span> to confirm
                  </label>
                  <Input 
                    className="mt-1"
                    placeholder="Type RESET"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReset}
              disabled={resetConfirmText !== 'RESET'}
              className="bg-red-600 hover:bg-red-700"
            >
              Reset Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
