import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
}

declare global {
  interface Navigator {
    connection?: {
      type?: string;
      effectiveType?: string;
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    };
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    connectionType: null,
    effectiveType: null,
  });

  const getConnectionInfo = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.connection) {
      return {
        connectionType: navigator.connection.type || null,
        effectiveType: navigator.connection.effectiveType || null,
      };
    }
    return { connectionType: null, effectiveType: null };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => {
        if (prev.wasOffline) {
          toast.success('You are back online', {
            description: 'Your connection has been restored',
          });
        }
        return {
          ...prev,
          isOnline: true,
          wasOffline: false,
          ...getConnectionInfo(),
        };
      });
    };

    const handleOffline = () => {
      toast.warning('You are offline', {
        description: 'Some features may not be available',
        duration: 10000,
      });
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
      }));
    };

    const handleConnectionChange = () => {
      setStatus(prev => ({
        ...prev,
        ...getConnectionInfo(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Set initial connection info
    setStatus(prev => ({
      ...prev,
      ...getConnectionInfo(),
    }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [getConnectionInfo]);

  return status;
}
