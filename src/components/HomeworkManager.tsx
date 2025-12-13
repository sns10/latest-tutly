import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from '@/hooks/useUserTuition';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, BookOpen, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Subject {
  id: string;
  name: string;
  class: string;
}

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  class: string;
  subject_id: string | null;
  tuition_id: string;
  created_at: string;
  subjects?: { name: string } | null;
}

const CLASSES = ['8th', '9th', '10th', '11th', '12th'];

export function HomeworkManager() {
  const { tuitionId } = useUserTuition();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    class: '',
    subject_id: '',
  });

  // Fetch homework
  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', tuitionId, selectedClass],
    queryFn: async () => {
      if (!tuitionId) return [];
      let query = supabase
        .from('homework')
        .select('*, subjects(name)')
        .eq('tuition_id', tuitionId)
        .order('due_date', { ascending: true });
      
      if (selectedClass) {
        query = query.eq('class', selectedClass);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Homework[];
    },
    enabled: !!tuitionId,
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', tuitionId, formData.class],
    queryFn: async () => {
      if (!tuitionId || !formData.class) return [];
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('tuition_id', tuitionId)
        .eq('class', formData.class);
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!tuitionId && !!formData.class,
  });

  // Create homework
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tuitionId) throw new Error('No tuition ID');
      const { error } = await supabase.from('homework').insert({
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date,
        class: formData.class,
        subject_id: formData.subject_id || null,
        tuition_id: tuitionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', due_date: '', class: '', subject_id: '' });
      toast.success('Homework added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add homework');
      console.error(error);
    },
  });

  // Delete homework
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      toast.success('Homework deleted');
    },
    onError: () => {
      toast.error('Failed to delete homework');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date || !formData.class) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate();
  };

  const isPastDue = (dueDate: string) => {
    return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Homework Manager
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Homework
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Homework</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Chapter 5 Exercises"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class *</Label>
                  <Select
                    value={formData.class}
                    onValueChange={(v) => setFormData({ ...formData, class: v, subject_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(v) => setFormData({ ...formData, subject_id: v })}
                    disabled={!formData.class}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description or instructions..."
                  rows={3}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Homework'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Class filter */}
        <div className="mb-4">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : homework.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No homework assigned yet. Click "Add Homework" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {homework.map((hw) => (
              <div 
                key={hw.id} 
                className={`flex items-start justify-between p-3 border rounded-lg ${
                  isPastDue(hw.due_date) ? 'border-muted bg-muted/30' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{hw.title}</h4>
                    <Badge variant="outline">{hw.class}</Badge>
                    {hw.subjects?.name && (
                      <Badge variant="secondary">{hw.subjects.name}</Badge>
                    )}
                    {isPastDue(hw.due_date) && (
                      <Badge variant="destructive">Past Due</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    Due: {format(new Date(hw.due_date), 'EEE, MMM d, yyyy')}
                  </div>
                  {hw.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {hw.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(hw.id)}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
