import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useTuitionStatus } from '@/hooks/useTuitionStatus';
import { TuitionInactiveScreen } from './TuitionInactiveScreen';
import { Loader2 } from 'lucide-react';
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
  const [isPortalUser, setIsPortalUser] = useState<boolean | null>(null);
  const [checkingPortal, setCheckingPortal] = useState(true);

  // Check if user is a portal user
  useEffect(() => {
    const checkPortalUser = async () => {
      if (!user?.email) {
        setIsPortalUser(false);
        setCheckingPortal(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tuitions')
          .select('id')
          .eq('portal_email', user.email.toLowerCase())
          .limit(1);

        if (!error && data && data.length > 0) {
          setIsPortalUser(true);
        } else {
          setIsPortalUser(false);
        }
      } catch (err) {
        setIsPortalUser(false);
      } finally {
        setCheckingPortal(false);
      }
    };

    checkPortalUser();
  }, [user?.email]);

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

  // If user is a portal user and this route allows portal users, grant access
  if (isPortalUser && allowPortalUsers) {
    return <>{children}</>;
  }

  // If no role and not a portal user, redirect to auth
  if (!role && !isPortalUser) {
    return <Navigate to="/auth" replace />;
  }

  // Portal users without a role should go to student page
  if (!role && isPortalUser) {
    if (location.pathname !== '/student') {
      return <Navigate to="/student" replace />;
    }
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (role === 'tuition_admin') return <Navigate to="/" replace />;
    if (role === 'student' || role === 'parent') return <Navigate to="/student" replace />;
    return <Navigate to="/auth" replace />;
  }

  // Check tuition status for non-super-admin users
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
