import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, LogOut, Mail } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface TuitionInactiveScreenProps {
  reason: 'inactive' | 'expired' | 'suspended';
  tuitionName?: string | null;
}

export function TuitionInactiveScreen({ reason, tuitionName }: TuitionInactiveScreenProps) {
  const { signOut } = useAuth();

  const getMessage = () => {
    switch (reason) {
      case 'inactive':
        return {
          title: 'Account Deactivated',
          description: 'Your tuition center account has been deactivated. Please contact the administrator for assistance.',
        };
      case 'expired':
        return {
          title: 'Subscription Expired',
          description: 'Your subscription has expired. Please renew your subscription to continue using the platform.',
        };
      case 'suspended':
        return {
          title: 'Account Suspended',
          description: 'Your tuition center account has been suspended. Please contact the administrator for more information.',
        };
      default:
        return {
          title: 'Access Restricted',
          description: 'You do not have access to this platform. Please contact the administrator.',
        };
    }
  };

  const { title, description } = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
          {tuitionName && (
            <p className="text-sm text-muted-foreground mt-1">{tuitionName}</p>
          )}
          <CardDescription className="mt-2">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Need help?</p>
            <a 
              href="mailto:support@upskillrtutly.com" 
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
