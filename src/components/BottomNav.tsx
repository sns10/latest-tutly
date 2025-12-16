import { NavLink } from 'react-router-dom';
import { Home, Trophy, Clock, DollarSign, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useTuitionFeatures, FeatureKey } from '@/hooks/useTuitionFeatures';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  featureKey?: FeatureKey;
}

const tuitionAdminItems: NavItem[] = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Board', url: '/leaderboard', icon: Trophy, featureKey: 'leaderboard' },
  { title: 'Schedule', url: '/timetable', icon: Clock, featureKey: 'timetable' },
  { title: 'Reports', url: '/reports', icon: FileText },
];

const superAdminItems: NavItem[] = [
  { title: 'Dashboard', url: '/super-admin', icon: Shield },
];

export function BottomNav() {
  const { role, loading: roleLoading } = useUserRole();
  const { isFeatureEnabled, loading: featuresLoading } = useTuitionFeatures();

  // Don't show bottom nav for students/parents or while loading
  if (roleLoading || role === 'student' || role === 'parent' || !role) {
    return null;
  }

  const baseNavItems = role === 'super_admin' ? superAdminItems : tuitionAdminItems;
  
  // Filter nav items based on enabled features (only for tuition admins)
  const navItems = role === 'super_admin' 
    ? baseNavItems 
    : baseNavItems.filter(item => !item.featureKey || isFeatureEnabled(item.featureKey));

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
