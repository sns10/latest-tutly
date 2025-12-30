import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SubscriptionExpiryAlertProps {
  subscriptionEndDate: string | null;
}

export const SubscriptionExpiryAlert = ({ subscriptionEndDate }: SubscriptionExpiryAlertProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (!subscriptionEndDate || dismissed) return null;

  const endDate = new Date(subscriptionEndDate);
  const today = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Only show if 5 days or less remaining
  if (daysRemaining > 5 || daysRemaining < 0) return null;

  const getAlertVariant = () => {
    if (daysRemaining <= 1) return "destructive";
    if (daysRemaining <= 3) return "destructive";
    return "default";
  };

  const getMessage = () => {
    if (daysRemaining === 0) {
      return "Your subscription expires today! Please renew to continue using all features.";
    }
    if (daysRemaining === 1) {
      return "Your subscription expires tomorrow! Please renew to avoid service interruption.";
    }
    return `Your subscription expires in ${daysRemaining} days. Please renew soon to continue using all features.`;
  };

  return (
    <Alert 
      variant={getAlertVariant()} 
      className="mb-4 border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 relative"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="font-semibold">Subscription Expiring Soon</AlertTitle>
      <AlertDescription className="pr-8">
        {getMessage()}
        <span className="block text-xs mt-1 opacity-75">
          Expiry date: {endDate.toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </span>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};
