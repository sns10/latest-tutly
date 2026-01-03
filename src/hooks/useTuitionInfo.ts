import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';

interface TuitionInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  portal_email: string | null;
  subscription_end_date: string | null;
}

export function useTuitionInfo() {
  const { tuitionId, loading: tuitionIdLoading } = useUserTuition();
  const [tuition, setTuition] = useState<TuitionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTuition = useCallback(async () => {
    if (!tuitionId) {
      setTuition(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tuitions')
        .select('id, name, email, phone, address, logo_url, portal_email, subscription_end_date')
        .eq('id', tuitionId)
        .maybeSingle();

      if (error) throw error;
      setTuition(data);
    } catch (error) {
      console.error('Error fetching tuition info:', error);
      setTuition(null);
    } finally {
      setLoading(false);
    }
  }, [tuitionId]);

  useEffect(() => {
    if (!tuitionIdLoading) {
      fetchTuition();
    }
  }, [tuitionId, tuitionIdLoading, fetchTuition]);

  return { tuition, loading: loading || tuitionIdLoading, refetch: fetchTuition };
}