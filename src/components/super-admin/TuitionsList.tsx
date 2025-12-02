import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Phone, MapPin, Calendar, Settings, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface TuitionsListProps {
  tuitions: any[];
  loading: boolean;
  onRefresh: () => void;
}

export function TuitionsList({ tuitions, loading, onRefresh }: TuitionsListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tuitions.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No tuitions yet</h3>
          <p className="text-slate-600 mb-4">Get started by creating your first tuition center</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tuitions.map((tuition) => (
        <Card 
          key={tuition.id} 
          className="border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-slate-300"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tuition.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {tuition.email || 'No email'}
                  </CardDescription>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge 
                variant={tuition.is_active ? 'default' : 'secondary'}
                className={tuition.is_active ? 'bg-green-500' : 'bg-slate-400'}
              >
                {tuition.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge 
                variant="outline"
                className={
                  tuition.subscription_status === 'active' 
                    ? 'border-green-500 text-green-700' 
                    : 'border-orange-500 text-orange-700'
                }
              >
                {tuition.subscription_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tuition.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-4 w-4" />
                <span>{tuition.phone}</span>
              </div>
            )}
            {tuition.address && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{tuition.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4" />
              <span>Created {format(new Date(tuition.created_at), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Users className="h-4 w-4 mr-1" />
                Manage
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
