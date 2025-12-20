import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, DollarSign, Plus, Users, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 px-3 sm:px-6">
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-2 sm:py-3 flex-col items-start gap-1"
          onClick={() => navigate('/students')}
        >
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 sm:mb-1 text-indigo-600" />
          <span className="text-[10px] sm:text-xs">Students</span>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-2 sm:py-3 flex-col items-start gap-1"
          onClick={() => navigate('/tests')}
        >
          <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 sm:mb-1 text-purple-600" />
          <span className="text-[10px] sm:text-xs">Tests</span>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-2 sm:py-3 flex-col items-start gap-1"
          onClick={() => navigate('/attendance')}
        >
          <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 sm:mb-1 text-green-600" />
          <span className="text-[10px] sm:text-xs">Attendance</span>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-2 sm:py-3 flex-col items-start gap-1"
          onClick={() => navigate('/timetable')}
        >
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 sm:mb-1 text-blue-600" />
          <span className="text-[10px] sm:text-xs">Timetable</span>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-2 sm:py-3 flex-col items-start gap-1"
          onClick={() => navigate('/fees')}
        >
          <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 sm:mb-1 text-orange-600" />
          <span className="text-[10px] sm:text-xs">Fees</span>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-2 sm:py-3 flex-col items-start gap-1"
          onClick={() => navigate('/tests')}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mb-0.5 sm:mb-1 text-gray-600" />
          <span className="text-[10px] sm:text-xs">New Test</span>
        </Button>
      </CardContent>
    </Card>
  );
}
