import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TestTube2, 
  Users, 
  CalendarDays, 
  DollarSign, 
  Trophy, 
  Megaphone,
  ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ManagementCardsProps {
  testsCount: number;
  studentsCount: number;
  attendanceToday: number;
  pendingFees: number;
  activeChallenges: number;
}

export function ManagementCards({
  testsCount,
  studentsCount,
  attendanceToday,
  pendingFees,
  activeChallenges,
}: ManagementCardsProps) {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Tests',
      icon: TestTube2,
      value: testsCount,
      description: 'Active tests',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      route: '/tests',
    },
    {
      title: 'Students',
      icon: Users,
      value: studentsCount,
      description: 'Total enrolled',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      route: '/students',
    },
    {
      title: 'Attendance',
      icon: CalendarDays,
      value: `${attendanceToday}%`,
      description: 'Today',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      route: '/attendance',
    },
    {
      title: 'Fees',
      icon: DollarSign,
      value: pendingFees,
      description: 'Pending payments',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      route: '/fees',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-white border border-gray-100"
          onClick={() => navigate(card.route)}
        >
          <CardContent className="p-4">
            <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center mb-3`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
