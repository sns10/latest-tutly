import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

// VAPID public key - this should be generated and stored securely
// For now, we'll use a placeholder that will be replaced with actual key
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
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
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    return isSupported;
  }, []);

  // Get current permission status
  const getPermission = useCallback((): NotificationPermission | null => {
    if ('Notification' in window) {
      return Notification.permission;
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
          .single();

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
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subscriptionJson = subscription.toJSON();
      
      // Get user's tuition_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tuition_id')
        .eq('id', user.id)
        .single();

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

  // Initialize state
  useEffect(() => {
    const init = async () => {
      const isSupported = checkSupport();
      const permission = getPermission();
      const isSubscribed = await checkSubscription();

      setState({
        isSupported,
        isSubscribed,
        isLoading: false,
        permission,
      });
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
  };
}
