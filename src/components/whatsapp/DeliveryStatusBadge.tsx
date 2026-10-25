import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, X } from 'lucide-react';

export function DeliveryStatusBadge({ status }: { status: string }) {
  if (status === 'read') return <Badge className="gap-1"><CheckCheck className="h-3 w-3" />Read</Badge>;
  if (status === 'delivered') return <Badge variant="secondary" className="gap-1"><CheckCheck className="h-3 w-3" />Delivered</Badge>;
  if (status === 'failed') return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />Failed</Badge>;
  return <Badge variant="outline" className="gap-1"><Check className="h-3 w-3" />Sent</Badge>;
}
