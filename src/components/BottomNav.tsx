import { memo, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Trophy, Clock, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useTuitionFeatures, FeatureKey } from '@/hooks/useTuitionFeatures';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey?: FeatureKey;
}

const tuitionAdminItems: NavItem[] = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Board', url: '/leaderboard', icon: Trophy, featureKey: 'leaderboard' },
  { title: 'Schedule', url: '/timetable', icon: Clock, featureKey: 'timetable' },
  { title: 'Reports', url: '/reports', icon: FileText, featureKey: 'reports' },
];

const superAdminItems: NavItem[] = [
  { title: 'Dashboard', url: '/super-admin', icon: Shield },
];

// Memoized nav item component for better performance
const NavItem = memo(({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  return (
    <NavLink
      key={item.url}
      to={item.url}
      end={item.url === '/' || item.url === '/super-admin'}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors flex-1 touch-manipulation',
          isActive
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-600 active:bg-gray-100'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
          <span className="text-[10px] font-medium">{item.title}</span>
        </>
      )}
    </NavLink>
  );
});

NavItem.displayName = 'NavItem';

export const BottomNav = memo(function BottomNav() {
  const { role, loading: roleLoading } = useUserRole();
  const { isFeatureEnabled, loading: featuresLoading } = useTuitionFeatures();

  // Memoize the nav items computation
  const navItems = useMemo(() => {
    if (roleLoading || role === 'student' || role === 'parent' || !role) {
      return [];
    }
    
    const baseNavItems = role === 'super_admin' ? superAdminItems : tuitionAdminItems;
    
    return role === 'super_admin' 
      ? baseNavItems 
      : baseNavItems.filter(item => !item.featureKey || isFeatureEnabled(item.featureKey));
  }, [role, roleLoading, isFeatureEnabled]);

  // Don't show bottom nav for students/parents or while loading
  if (!navItems.length) {
    return null;
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden will-change-transform"
      style={{ contain: 'layout style' }}
    >
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {navItems.map((item) => (
          <NavItem key={item.url} item={item} />
        ))}
      </div>
    </nav>
  );
});
