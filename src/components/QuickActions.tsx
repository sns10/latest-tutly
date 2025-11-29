import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus, FileText, TrendingUp } from 'lucide-react';
import { CreateTestDialog } from './CreateTestDialog';
import { WeeklyTest } from '@/types';

interface QuickActionsProps {
  onAddTest: (test: Omit<WeeklyTest, 'id'>) => void;
}

export function QuickActions({ onAddTest }: QuickActionsProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <div className="w-full">
          <CreateTestDialog onAddTest={onAddTest} />
        </div>
        <Button variant="outline" className="w-full justify-start h-auto py-3 flex-col items-start gap-1">
          <UserPlus className="h-4 w-4 mb-1" />
          <span className="text-xs">Add Student</span>
        </Button>
        <Button variant="outline" className="w-full justify-start h-auto py-3 flex-col items-start gap-1">
          <FileText className="h-4 w-4 mb-1" />
          <span className="text-xs">Enter Marks</span>
        </Button>
        <Button variant="outline" className="w-full justify-start h-auto py-3 flex-col items-start gap-1">
          <TrendingUp className="h-4 w-4 mb-1" />
          <span className="text-xs">View Reports</span>
        </Button>
      </CardContent>
    </Card>
  );
}
