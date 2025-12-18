import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Database, Download, RefreshCw, Loader2, Calendar, HardDrive, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SuperAdminBackupsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tuitions: any[];
}

export function SuperAdminBackups({ open, onOpenChange, tuitions }: SuperAdminBackupsProps) {
  const [selectedTuition, setSelectedTuition] = useState<string>('');
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  useEffect(() => {
    if (open && selectedTuition) {
      fetchBackups();
    }
  }, [open, selectedTuition]);

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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Export & Backup Management
          </DialogTitle>
          <DialogDescription>
            Export data or manage snapshots for any tuition center
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Tuition Selector */}
          <Select value={selectedTuition} onValueChange={setSelectedTuition}>
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
              {/* Export Actions */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium">Quick Export</h3>
                    <p className="text-sm text-muted-foreground">
                      Download data instantly (no storage used)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleExportData} disabled={exporting}>
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

              <Separator />

              {/* Stored Snapshots */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Stored Snapshots (max 2)
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
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
