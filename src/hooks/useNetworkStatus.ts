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
    try {
      const connection = typeof navigator !== 'undefined' ? navigator.connection : undefined;
      if (connection) {
        return {
          connectionType: connection.type || null,
          effectiveType: connection.effectiveType || null,
        };
      }
    } catch {
      // Some browsers expose a partial/buggy navigator.connection implementation.
    }
    return { connectionType: null, effectiveType: null };
  }, []);

  useEffect(() => {
    // Defensive: some mobile browsers can throw when touching Network Information API.
    const connection = typeof navigator !== 'undefined' ? navigator.connection : undefined;

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

    // Listen for connection changes (only if the API is fully supported)
    if (connection && typeof connection.addEventListener === 'function') {
      try {
        connection.addEventListener('change', handleConnectionChange);
      } catch {
        // ignore
      }
    }

    // Set initial connection info
    setStatus(prev => ({
      ...prev,
      ...getConnectionInfo(),
    }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection && typeof connection.removeEventListener === 'function') {
        try {
          connection.removeEventListener('change', handleConnectionChange);
        } catch {
          // ignore
        }
      }
    };
  }, [getConnectionInfo]);

  return status;
}
