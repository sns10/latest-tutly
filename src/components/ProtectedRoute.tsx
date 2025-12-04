import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useTuitionStatus } from '@/hooks/useTuitionStatus';
import { TuitionInactiveScreen } from './TuitionInactiveScreen';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { status, loading: statusLoading, isOperational } = useTuitionStatus();

  if (authLoading || roleLoading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If no role yet (still loading or no role assigned), redirect to auth
  if (!role) {
    return <Navigate to="/auth" replace />;
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
