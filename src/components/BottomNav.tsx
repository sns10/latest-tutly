import { NavLink } from 'react-router-dom';
import { Home, Trophy, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Board', url: '/leaderboard', icon: Trophy },
  { title: 'Schedule', url: '/timetable', icon: Clock },
  { title: 'Fees', url: '/fees', icon: DollarSign },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors flex-1',
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span className="text-[10px] font-medium">{item.title}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
