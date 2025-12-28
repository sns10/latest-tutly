import { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TestTube2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ManagementCardsProps {
  testsCount: number;
  studentsCount: number;
  activeChallenges: number;
}

interface CardData {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  description: string;
  color: string;
  bgColor: string;
  route: string;
}

const cards: Omit<CardData, 'value'>[] = [
  {
    title: 'Tests',
    icon: TestTube2,
    description: 'Active tests',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    route: '/tests',
  },
  {
    title: 'Students',
    icon: Users,
    description: 'Total enrolled',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    route: '/students',
  },
];

// Memoized card component
const StatCard = memo(({ 
  card, 
  value, 
  onClick 
}: { 
  card: Omit<CardData, 'value'>; 
  value: number; 
  onClick: () => void;
}) => {
  const Icon = card.icon;
  
  return (
    <Card
      className="cursor-pointer active:scale-[0.98] transition-transform bg-white border border-gray-100 touch-manipulation"
      onClick={onClick}
      style={{ contain: 'content' }}
    >
      <CardContent className="p-3 sm:p-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${card.bgColor} flex items-center justify-center mb-2 sm:mb-3`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
        </div>
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-xl sm:text-2xl font-bold">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{card.description}</p>
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

export const ManagementCards = memo(function ManagementCards({
  testsCount,
  studentsCount,
}: ManagementCardsProps) {
  const navigate = useNavigate();
  
  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  const values = [testsCount, studentsCount];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
      {cards.map((card, index) => (
        <StatCard
          key={card.title}
          card={card}
          value={values[index]}
          onClick={() => handleNavigate(card.route)}
        />
      ))}
    </div>
  );
});
