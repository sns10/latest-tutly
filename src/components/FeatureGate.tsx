import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTuitionFeatures, FeatureKey } from '@/hooks/useTuitionFeatures';
import { Loader2 } from 'lucide-react';

interface FeatureGateProps {
  featureKey: FeatureKey;
  children: ReactNode;
  featureName?: string;
}

export function FeatureGate({ featureKey, children, featureName }: FeatureGateProps) {
  const { isFeatureEnabled, loading } = useTuitionFeatures();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isFeatureEnabled(featureKey)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-slate-400" />
            </div>
            <CardTitle className="text-xl text-slate-900">Feature Not Available</CardTitle>
            <CardDescription className="mt-2">
              The {featureName || featureKey} feature is not enabled for your tuition center. 
              Please contact your administrator to enable this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/')}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
