import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';

interface TuitionInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

export function useTuitionInfo() {
  const { tuitionId, loading: tuitionIdLoading } = useUserTuition();
  const [tuition, setTuition] = useState<TuitionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTuition = async () => {
      if (!tuitionId) {
        setTuition(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tuitions')
          .select('id, name, email, phone, logo_url')
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
    };

    if (!tuitionIdLoading) {
      fetchTuition();
    }
  }, [tuitionId, tuitionIdLoading]);

  return { tuition, loading: loading || tuitionIdLoading };
}
