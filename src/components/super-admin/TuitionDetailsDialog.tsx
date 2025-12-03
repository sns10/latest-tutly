import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, BookOpen, GraduationCap, Calendar, Mail, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface TuitionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tuition: any;
}

export function TuitionDetailsDialog({ open, onOpenChange, tuition }: TuitionDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    faculty: 0,
    subjects: 0,
    classes: [] as string[],
  });

  useEffect(() => {
    if (open && tuition) {
      fetchTuitionStats();
    }
  }, [open, tuition]);

  const fetchTuitionStats = async () => {
    setLoading(true);
    try {
      const [studentsRes, facultyRes, subjectsRes] = await Promise.all([
        supabase.from('students').select('id, class', { count: 'exact' }).eq('tuition_id', tuition.id),
        supabase.from('faculty').select('id', { count: 'exact' }).eq('tuition_id', tuition.id),
        supabase.from('subjects').select('id', { count: 'exact' }).eq('tuition_id', tuition.id),
      ]);

      const uniqueClasses = [...new Set((studentsRes.data || []).map(s => s.class))];

      setStats({
        students: studentsRes.count || 0,
        faculty: facultyRes.count || 0,
        subjects: subjectsRes.count || 0,
        classes: uniqueClasses,
      });
    } catch (error) {
      console.error('Error fetching tuition stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!tuition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">{tuition.name}</DialogTitle>
              <DialogDescription>Tuition center details and statistics</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badges */}
          <div className="flex gap-2">
            <Badge variant={tuition.is_active ? 'default' : 'secondary'} className={tuition.is_active ? 'bg-green-500' : ''}>
              {tuition.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline" className={tuition.subscription_status === 'active' ? 'border-green-500 text-green-700' : 'border-orange-500 text-orange-700'}>
              {tuition.subscription_status}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            {tuition.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{tuition.email}</span>
              </div>
            )}
            {tuition.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{tuition.phone}</span>
              </div>
            )}
            {tuition.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{tuition.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created {format(new Date(tuition.created_at), 'MMMM d, yyyy')}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.students}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Faculty
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.faculty}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subjects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.subjects}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Classes */}
          {stats.classes.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Classes</p>
              <div className="flex flex-wrap gap-2">
                {stats.classes.map((cls) => (
                  <Badge key={cls} variant="outline">{cls}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
