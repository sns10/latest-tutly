import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

// VAPID public key - this is a publishable key that identifies the application server
// It must be set in .env as VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const HAS_VAPID_KEY = VAPID_PUBLIC_KEY.length > 0;

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  } catch (error) {
    console.error('Error converting base64:', error);
    return new ArrayBuffer(0);
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: null,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    try {
      // Check browser APIs
      const hasApis = 
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window;
      
      // Also require VAPID key to be configured
      return hasApis && HAS_VAPID_KEY;
    } catch {
      return false;
    }
  }, []);

  // Get current permission status
  const getPermission = useCallback((): NotificationPermission | null => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission;
      }
    } catch (error) {
      console.error('Error getting permission:', error);
    }
    return null;
  }, []);

  // Check if user is already subscribed
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!user || !checkSupport()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Verify subscription exists in database
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();

        return !error && !!data;
      }
      return false;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }, [user, checkSupport]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to enable notifications');
      return false;
    }

    if (!checkSupport()) {
      toast.error('Push notifications are not supported on this device');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      toast.error('Push notifications are not configured. Please contact support.');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      if (applicationServerKey.byteLength === 0) {
        toast.error('Invalid VAPID key configuration');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subscriptionJson = subscription.toJSON();
      
      // Get user's tuition_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tuition_id')
        .eq('id', user.id)
        .maybeSingle();

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          tuition_id: profile?.tuition_id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys?.p256dh!,
          auth: subscriptionJson.keys?.auth!,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('Error saving subscription:', error);
        toast.error('Failed to save notification settings');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      toast.success('Push notifications enabled! You will receive attendance reminders.');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, checkSupport]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Send a test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in first');
      return false;
    }

    if (!state.isSubscribed) {
      toast.error('Please enable push notifications first');
      return false;
    }

    try {
      // Try browser notification first for immediate feedback
      if ('Notification' in window && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Test Notification', {
          body: 'Push notifications are working! You will receive attendance reminders.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'test-notification',
          requireInteraction: false,
        });
        toast.success('Test notification sent! Check your notifications.');
        return true;
      } else {
        toast.error('Notification permission not granted');
        return false;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
      return false;
    }
  }, [user, state.isSubscribed]);

  // Initialize state
  useEffect(() => {
    const init = async () => {
      try {
        const isSupported = checkSupport();
        const permission = getPermission();
        const isSubscribed = await checkSubscription();

        setState({
          isSupported,
          isSubscribed,
          isLoading: false,
          permission,
        });
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        setState({
          isSupported: false,
          isSubscribed: false,
          isLoading: false,
          permission: null,
        });
      }
    };

    if (user) {
      init();
    } else {
      setState({
        isSupported: checkSupport(),
        isSubscribed: false,
        isLoading: false,
        permission: getPermission(),
      });
    }
  }, [user, checkSupport, getPermission, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
