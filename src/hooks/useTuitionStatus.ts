import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';

interface TuitionStatus {
  isActive: boolean;
  subscriptionStatus: string;
  tuitionName: string | null;
}

export function useTuitionStatus() {
  const { tuitionId, loading: tuitionLoading } = useUserTuition();
  const [status, setStatus] = useState<TuitionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTuitionStatus = async () => {
      if (!tuitionId) {
        setStatus(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tuitions')
          .select('is_active, subscription_status, name')
          .eq('id', tuitionId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setStatus({
            isActive: data.is_active,
            subscriptionStatus: data.subscription_status,
            tuitionName: data.name,
          });
        } else {
          setStatus(null);
        }
      } catch (error) {
        console.error('Error fetching tuition status:', error);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    if (!tuitionLoading) {
      fetchTuitionStatus();
    }
  }, [tuitionId, tuitionLoading]);

  const isOperational = status?.isActive && 
    (status?.subscriptionStatus === 'active' || status?.subscriptionStatus === 'trial');

  return { 
    status, 
    loading: loading || tuitionLoading, 
    isOperational,
    tuitionId 
  };
}
