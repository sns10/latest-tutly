import { NavLink } from 'react-router-dom';
import { Home, Trophy, Clock, DollarSign, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

const tuitionAdminItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Board', url: '/leaderboard', icon: Trophy },
  { title: 'Schedule', url: '/timetable', icon: Clock },
  { title: 'Fees', url: '/fees', icon: DollarSign },
];

const superAdminItems = [
  { title: 'Dashboard', url: '/super-admin', icon: Shield },
];

export function BottomNav() {
  const { role, loading } = useUserRole();

  // Don't show bottom nav for students/parents or while loading
  if (loading || role === 'student' || role === 'parent' || !role) {
    return null;
  }

  const navItems = role === 'super_admin' ? superAdminItems : tuitionAdminItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/' || item.url === '/super-admin'}
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
