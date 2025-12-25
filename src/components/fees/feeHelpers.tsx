import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

export function getStatusBadge(status: string) {
    switch (status) {
        case 'paid':
            return (
                <Badge variant="default" className="gap-1 bg-green-100 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Paid
                </Badge>
            );
        case 'partial':
            return (
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-300">
                    <Clock className="h-3 w-3" />
                    Partial
                </Badge>
            );
        case 'overdue':
            return (
                <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Overdue
                </Badge>
            );
        case 'unpaid':
        default:
            return (
                <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                    <XCircle className="h-3 w-3" />
                    Unpaid
                </Badge>
            );
    }
}
