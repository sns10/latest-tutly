import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function AuthPage() {
  const { user, signIn, signUp, signOut, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPortalUser, setIsPortalUser] = useState<boolean | null>(null);
  const [isLinkedStudent, setIsLinkedStudent] = useState<boolean | null>(null);
  const [checkingPortal, setCheckingPortal] = useState(false);

  // Check if user is a portal user (shared portal email) or a linked student account
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user?.email || !user?.id) {
        setIsPortalUser(null);
        setIsLinkedStudent(null);
        return;
      }

      setCheckingPortal(true);
      try {
        // Check if this is a shared portal email
        const { data: tuitionData } = await supabase
          .from('tuitions')
          .select('id')
          .eq('portal_email', user.email.toLowerCase())
          .limit(1);

        if (tuitionData && tuitionData.length > 0) {
          setIsPortalUser(true);
          setIsLinkedStudent(false);
        } else {
          setIsPortalUser(false);
          
          // Check if user has a linked student account (via user_id or email)
          const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase()}`)
            .limit(1);

          setIsLinkedStudent(studentData && studentData.length > 0);
        }
      } catch (err) {
        console.error('Error checking user access:', err);
        setIsPortalUser(false);
        setIsLinkedStudent(false);
      } finally {
        setCheckingPortal(false);
      }
    };

    checkUserAccess();
  }, [user?.email, user?.id]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Failed to sign in');
    } else {
      toast.success('Signed in successfully!');
    }

    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signUp(email, password);

    if (error) {
      toast.error(error.message || 'Failed to create account');
    } else {
      toast.success('Account created! Please check your email to verify your account.');
    }

    setIsSubmitting(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in, wait for role to load then redirect
  if (user) {
    if (roleLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Check if still determining portal user status
    if (checkingPortal) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // If user is a portal user or has a linked student account, redirect to student page
    if (isPortalUser === true || isLinkedStudent === true) {
      return <Navigate to="/student" replace />;
    }
    
    // Redirect based on role
    if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (role === 'tuition_admin') return <Navigate to="/" replace />;
    if (role === 'student' || role === 'parent') return <Navigate to="/student" replace />;
    
    // No role assigned - show error with sign out option
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">No Role Assigned</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your account doesn't have a role assigned. Please contact the administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Logged in as: {user.email}
            </p>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not logged in - show auth form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Upskillr Tutly
          </CardTitle>
          <p className="text-muted-foreground">Tuition Management Platform</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
