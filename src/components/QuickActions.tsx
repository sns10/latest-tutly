import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, DollarSign } from 'lucide-react';
import { CreateTestDialog } from './CreateTestDialog';
import { WeeklyTest, Subject } from '@/types';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
  subjects: Subject[];
}

// Memoized action button
const ActionButton = memo(({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  onClick: () => void;
}) => (
  <Button 
    variant="outline" 
    className="w-full justify-start h-auto py-2 sm:py-3 flex-col items-start gap-1 touch-manipulation active:scale-[0.98] transition-transform"
    onClick={onClick}
  >
    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 sm:mb-1" />
    <span className="text-[10px] sm:text-xs">{label}</span>
  </Button>
));

ActionButton.displayName = 'ActionButton';

export const QuickActions = memo(function QuickActions({ onAddTest, subjects }: QuickActionsProps) {
  const navigate = useNavigate();
  
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return (
    <Card className="bg-white border border-gray-100 shadow-sm" style={{ contain: 'content' }}>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 px-3 sm:px-6">
        <ActionButton 
          icon={CalendarDays} 
          label="Attendance" 
          onClick={() => handleNavigate('/attendance')} 
        />
        <ActionButton 
          icon={Clock} 
          label="Timetable" 
          onClick={() => handleNavigate('/timetable')} 
        />
        <div className="w-full">
          <CreateTestDialog onAddTest={onAddTest} subjects={subjects} />
        </div>
        <ActionButton 
          icon={DollarSign} 
          label="Collect Fee" 
          onClick={() => handleNavigate('/fees')} 
        />
      </CardContent>
    </Card>
  );
});
