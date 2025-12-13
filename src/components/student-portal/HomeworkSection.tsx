import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  class: string;
  subject_id: string | null;
}

interface Subject {
  id: string;
  name: string;
}

interface HomeworkSectionProps {
  homework: Homework[];
  subjects: Subject[];
}

export function HomeworkSection({ homework, subjects }: HomeworkSectionProps) {
  const today = startOfDay(new Date());

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return 'General';
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown';
  };

  const getDueStatus = (dueDate: string) => {
    const due = startOfDay(new Date(dueDate));
    if (isBefore(due, today)) {
      return { label: 'Overdue', variant: 'destructive' as const };
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (isBefore(due, tomorrow)) {
      return { label: 'Due Today', variant: 'default' as const };
    }
    const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 3) {
      return { label: `${daysDiff} days left`, variant: 'secondary' as const };
    }
    return { label: format(new Date(dueDate), 'MMM d'), variant: 'outline' as const };
  };

  // Sort by due date (nearest first)
  const sortedHomework = [...homework].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  // Filter to show only upcoming and recent overdue (within 7 days)
  const activeHomework = sortedHomework.filter(hw => {
    const dueDate = new Date(hw.due_date);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return isAfter(dueDate, sevenDaysAgo);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Homework
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeHomework.length > 0 ? (
          <div className="space-y-3">
            {activeHomework.map((hw) => {
              const dueStatus = getDueStatus(hw.due_date);
              const isOverdue = dueStatus.label === 'Overdue';
              
              return (
                <div 
                  key={hw.id} 
                  className={`p-3 border rounded-lg ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="font-medium text-sm">{hw.title}</h4>
                    <Badge variant={dueStatus.variant} className="shrink-0 text-xs">
                      {dueStatus.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Badge variant="outline" className="text-xs">
                      {getSubjectName(hw.subject_id)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(hw.due_date), 'EEE, MMM d')}
                    </div>
                  </div>
                  {hw.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {hw.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No homework assigned yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
