import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, FileText, DollarSign } from 'lucide-react';
import { CreateTestDialog } from './CreateTestDialog';
import { WeeklyTest } from '@/types';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
}

export function QuickActions({ onAddTest }: QuickActionsProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-3 flex-col items-start gap-1"
          onClick={() => navigate('/attendance')}
        >
          <CalendarDays className="h-4 w-4 mb-1" />
          <span className="text-xs">Attendance</span>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-3 flex-col items-start gap-1"
          onClick={() => navigate('/timetable')}
        >
          <Clock className="h-4 w-4 mb-1" />
          <span className="text-xs">Timetable</span>
        </Button>
        <div className="w-full">
          <CreateTestDialog onAddTest={onAddTest} />
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-3 flex-col items-start gap-1"
          onClick={() => navigate('/fees')}
        >
          <DollarSign className="h-4 w-4 mb-1" />
          <span className="text-xs">Collect Fee</span>
        </Button>
      </CardContent>
    </Card>
  );
}
