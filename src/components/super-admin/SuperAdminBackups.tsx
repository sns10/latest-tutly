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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Download, RefreshCw, Loader2, Calendar, HardDrive } from 'lucide-react';
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
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (open && selectedTuition) {
      fetchBackups();
    }
  }, [open, selectedTuition]);

  const fetchBackups = async () => {
    if (!selectedTuition) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tuition_backups')
        .select('*')
        .eq('tuition_id', selectedTuition)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const triggerBackup = async () => {
    if (!selectedTuition) {
      toast.error('Please select a tuition center first');
      return;
    }

    setTriggering(true);
    try {
      const { error } = await supabase.functions.invoke('backup-tuition-data', {
        body: { tuition_id: selectedTuition }
      });

      if (error) throw error;
      toast.success('Backup triggered successfully');
      fetchBackups();
    } catch (error) {
      console.error('Error triggering backup:', error);
      toast.error('Failed to trigger backup');
    } finally {
      setTriggering(false);
    }
  };

  const downloadBackup = (backup: any) => {
    const dataStr = JSON.stringify(backup.backup_data, null, 2);
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
            Backup Management
          </DialogTitle>
          <DialogDescription>
            View and manage backups for all tuition centers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2">
            <Select value={selectedTuition} onValueChange={setSelectedTuition}>
              <SelectTrigger className="flex-1">
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
            <Button 
              onClick={triggerBackup} 
              disabled={!selectedTuition || triggering}
            >
              {triggering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Trigger Backup
            </Button>
          </div>

          {selectedTuition && (
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No backups found for this tuition center
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <Card key={backup.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(new Date(backup.created_at), 'PPpp')}
                              </span>
                              <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                                {backup.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <HardDrive className="h-3 w-3" />
                              <span>{formatFileSize(backup.file_size)}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBackup(backup)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
