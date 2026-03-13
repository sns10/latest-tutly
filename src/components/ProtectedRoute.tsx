import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useTuitionStatus } from '@/hooks/useTuitionStatus';
import { TuitionInactiveScreen } from './TuitionInactiveScreen';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  allowPortalUsers?: boolean;
}

export function ProtectedRoute({ children, allowedRoles, allowPortalUsers = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { status, loading: statusLoading } = useTuitionStatus();
  const location = useLocation();

  // Cached portal user check — won't re-fetch on every navigation
  const { data: isPortalUser = false, isLoading: checkingPortal } = useQuery({
    queryKey: ['portalUser', user?.email],
    queryFn: async () => {
      if (!user?.email) return false;
      const { data, error } = await supabase
        .from('tuitions')
        .select('id')
        .eq('portal_email', user.email.toLowerCase())
        .limit(1);
      return !error && !!data && data.length > 0;
    },
    enabled: !!user?.email,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  if (authLoading || roleLoading || statusLoading || checkingPortal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isPortalUser && allowPortalUsers) {
    return <>{children}</>;
  }

  if (!role && !isPortalUser) {
    return <Navigate to="/auth" replace />;
  }

  if (!role && isPortalUser) {
    if (location.pathname !== '/student') {
      return <Navigate to="/student" replace />;
    }
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (role === 'tuition_admin') return <Navigate to="/" replace />;
    if (role === 'student' || role === 'parent') return <Navigate to="/student" replace />;
    return <Navigate to="/auth" replace />;
  }

  if (role !== 'super_admin' && status) {
    if (!status.isActive) {
      return <TuitionInactiveScreen reason="inactive" tuitionName={status.tuitionName} />;
    }
    if (status.subscriptionStatus === 'expired') {
      return <TuitionInactiveScreen reason="expired" tuitionName={status.tuitionName} />;
    }
    if (status.subscriptionStatus === 'suspended') {
      return <TuitionInactiveScreen reason="suspended" tuitionName={status.tuitionName} />;
    }
  }

  return <>{children}</>;
}
