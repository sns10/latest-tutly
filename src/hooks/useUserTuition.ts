import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export function useUserTuition() {
  const { user } = useAuth();
  const [tuitionId, setTuitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTuitionId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchTuitionId = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('tuition_id')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Error fetching tuition_id:', error);
      }
      setTuitionId(data?.tuition_id || null);
      setLoading(false);
    };

    fetchTuitionId();
    return () => { cancelled = true; };
  }, [user]);

  return { tuitionId, loading };
}
