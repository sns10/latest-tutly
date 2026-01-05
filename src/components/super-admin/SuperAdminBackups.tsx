import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Download, 
  RefreshCw, 
  Loader2, 
  Calendar, 
  HardDrive, 
  Archive, 
  Upload, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SuperAdminBackupsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tuitions: any[];
}

interface RestoreResult {
  success: boolean;
  count: number;
  error?: string;
}

interface RestoreResults {
  [key: string]: RestoreResult;
}

export function SuperAdminBackups({ open, onOpenChange, tuitions }: SuperAdminBackupsProps) {
  const [selectedTuition, setSelectedTuition] = useState<string>('');
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState<RestoreResults | null>(null);
  
  // Confirmation dialog state
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreSource, setRestoreSource] = useState<'backup' | 'file' | null>(null);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [uploadedBackupData, setUploadedBackupData] = useState<any>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && selectedTuition) {
      fetchBackups();
      setRestoreResults(null);
    }
  }, [open, selectedTuition]);

  useEffect(() => {
    if (!open) {
      setRestoreResults(null);
      setUploadedBackupData(null);
      setUploadedFileName('');
    }
  }, [open]);

  const fetchBackups = async () => {
    if (!selectedTuition) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId: selectedTuition, action: 'list' }
      });

      if (error) throw error;
      setBackups(data?.backups || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!selectedTuition) {
      toast.error('Please select a tuition center first');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId: selectedTuition, action: 'export' }
      });

      if (error) throw error;

      const tuitionName = tuitions.find(t => t.id === selectedTuition)?.name || 'tuition';
      const dataStr = JSON.stringify(data.backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tuitionName.replace(/\s+/g, '-').toLowerCase()}-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!selectedTuition) {
      toast.error('Please select a tuition center first');
      return;
    }

    setCreatingSnapshot(true);
    try {
      const { error } = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId: selectedTuition, action: 'create' }
      });

      if (error) throw error;
      toast.success('Snapshot created successfully');
      fetchBackups();
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast.error('Failed to create snapshot');
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const downloadBackup = async (backup: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuitionId: selectedTuition, action: 'download', backupId: backup.id }
      });

      if (error) throw error;

      const dataStr = JSON.stringify(data.backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backup.id.slice(0, 8)}-${format(new Date(backup.created_at), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup');
    }
  };

  const handleRestoreFromBackup = (backupId: string) => {
    setSelectedBackupId(backupId);
    setRestoreSource('backup');
    setShowRestoreConfirm(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a valid JSON backup file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);
        
        // Validate backup structure
        if (!backupData?.data || !backupData?.metadata) {
          toast.error('Invalid backup file format. Missing required data or metadata.');
          return;
        }

        setUploadedBackupData(backupData);
        setUploadedFileName(file.name);
        setRestoreSource('file');
        setShowRestoreConfirm(true);
      } catch (error) {
        console.error('Error parsing backup file:', error);
        toast.error('Failed to parse backup file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!selectedTuition) {
      toast.error('Please select a tuition center first');
      return;
    }

    setShowRestoreConfirm(false);
    setRestoring(true);
    setRestoreResults(null);

    try {
      const body: any = { tuitionId: selectedTuition, action: 'restore' };
      
      if (restoreSource === 'backup' && selectedBackupId) {
        body.backupId = selectedBackupId;
      } else if (restoreSource === 'file' && uploadedBackupData) {
        body.backupData = uploadedBackupData;
      }

      const { data, error } = await supabase.functions.invoke('backup-tuition-data', {
        body
      });

      if (error) throw error;

      if (data.success) {
        setRestoreResults(data.results);
        toast.success(data.message || 'Data restored successfully');
      } else {
        toast.error(data.error || 'Failed to restore data');
      }
    } catch (error) {
      console.error('Error restoring data:', error);
      toast.error('Failed to restore data. Please try again.');
    } finally {
      setRestoring(false);
      setSelectedBackupId(null);
      setUploadedBackupData(null);
      setUploadedFileName('');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTuitionName = () => {
    return tuitions.find(t => t.id === selectedTuition)?.name || 'Unknown';
  };

  const getRestoreStats = () => {
    if (!restoreResults) return { success: 0, failed: 0, total: 0, records: 0 };
    const entries = Object.values(restoreResults);
    const success = entries.filter(r => r.success).length;
    const failed = entries.filter(r => !r.success).length;
    const records = entries.reduce((acc, r) => acc + (r.success ? r.count : 0), 0);
    return { success, failed, total: entries.length, records };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Backup & Restore Management
            </DialogTitle>
            <DialogDescription>
              Export, backup, and restore data for any tuition center
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Tuition Selector */}
            <Select value={selectedTuition} onValueChange={(value) => {
              setSelectedTuition(value);
              setRestoreResults(null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tuition center" />
              </SelectTrigger>
              <SelectContent>
                {tuitions.map((tuition) => (
                  <SelectItem key={tuition.id} value={tuition.id}>
                    {tuition.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTuition && (
              <>
                {/* Restore Results */}
                {restoreResults && (
                  <Alert className={getRestoreStats().failed > 0 ? 'border-yellow-500' : 'border-green-500'}>
                    <div className="flex items-start gap-2">
                      {getRestoreStats().failed > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <AlertDescription>
                          <div className="font-medium mb-2">
                            Restore completed: {getRestoreStats().success}/{getRestoreStats().total} data types restored
                            ({getRestoreStats().records} total records)
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                            {Object.entries(restoreResults).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-1">
                                {value.success ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="text-muted-foreground">({value.count})</span>
                              </div>
                            ))}
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Export & Backup Actions */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium">Export & Backup</h3>
                      <p className="text-sm text-muted-foreground">
                        Download data or save a snapshot for recovery
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleExportData} disabled={exporting} size="sm">
                        {exporting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Export
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={handleCreateSnapshot}
                        disabled={creatingSnapshot}
                        size="sm"
                      >
                        {creatingSnapshot ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Archive className="h-4 w-4 mr-2" />
                        )}
                        Save Snapshot
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Restore from File */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium">Restore from File</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload a previously exported backup JSON file
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="backup-file-upload"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={restoring}
                        size="sm"
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        Upload & Restore
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stored Snapshots */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Stored Snapshots (max 5)
                    </h3>
                    <Button variant="ghost" size="sm" onClick={fetchBackups} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  <ScrollArea className="h-[200px]">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : backups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No snapshots found for this tuition center
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {backups.map((backup) => (
                          <div 
                            key={backup.id} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {format(new Date(backup.created_at), 'PPp')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(backup.file_size)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {backup.status}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadBackup(backup)}
                                title="Download backup"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleRestoreFromBackup(backup.id)}
                                disabled={restoring}
                                title="Restore from this backup"
                              >
                                {restoring && selectedBackupId === backup.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Warning Note */}
                <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-400">
                    <strong>Important:</strong> Restoring data will merge/overwrite existing records with matching IDs. 
                    It is recommended to create a snapshot before restoring.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Data Restore
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to restore data for <strong>{getTuitionName()}</strong>
                {restoreSource === 'file' && uploadedFileName && (
                  <span> from file <strong>{uploadedFileName}</strong></span>
                )}
                {restoreSource === 'backup' && (
                  <span> from stored snapshot</span>
                )}
                .
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">⚠️ Warning</p>
                <ul className="list-disc list-inside text-yellow-600 dark:text-yellow-500 space-y-1">
                  <li>Existing records with matching IDs will be overwritten</li>
                  <li>This action cannot be undone automatically</li>
                  <li>It is highly recommended to create a snapshot before proceeding</li>
                </ul>
              </div>
              <p className="font-medium">Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRestore}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Yes, Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
