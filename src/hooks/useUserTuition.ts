import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export function useUserTuition() {
  const { user } = useAuth();
  const [tuitionId, setTuitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTuitionId = async () => {
      if (!user) {
        setTuitionId(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('tuition_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        setTuitionId(data?.tuition_id || null);
      } catch (error) {
        console.error('Error fetching tuition_id:', error);
        setTuitionId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTuitionId();
  }, [user]);

  return { tuitionId, loading };
}
