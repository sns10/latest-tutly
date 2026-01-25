import { useState } from 'react';
import { Bell, BellOff, Smartphone, AlertCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    permission,
    subscribe, 
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    try {
      await sendTestNotification();
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive attendance reminders even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported on this browser/device. 
              Please use Chrome, Firefox, Edge, or Safari 16.4+ for push notification support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive attendance reminders even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-base">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when a class is about to end and attendance needs to be marked
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notification permission was denied. Please enable notifications in your browser settings to receive reminders.
            </AlertDescription>
          </Alert>
        )}

        {isSubscribed && (
          <>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Smartphone className="h-4 w-4" />
              <span>You will receive push notifications for attendance reminders</span>
            </div>
            <Button
              onClick={handleTestNotification}
              disabled={isSendingTest}
              variant="outline"
              className="w-full"
            >
              {isSendingTest ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSendingTest ? 'Sending...' : 'Send Test Notification'}
            </Button>
          </>
        )}

        {!isSubscribed && permission !== 'denied' && (
          <Button
            onClick={subscribe}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>You'll receive a notification 5-15 minutes before a class ends</li>
            <li>Click the notification to go directly to the attendance page</li>
            <li>Works even when your phone is locked or the app is closed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
