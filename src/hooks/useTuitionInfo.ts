import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';
import { useCallback } from 'react';

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
  const queryClient = useQueryClient();

  const { data: tuition = null, isLoading } = useQuery({
    queryKey: ['tuitionInfo', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return null;

      const { data, error } = await supabase
        .from('tuitions')
        .select('id, name, email, phone, address, logo_url, portal_email, subscription_end_date')
        .eq('id', tuitionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tuition info:', error);
        return null;
      }
      return data as TuitionInfo | null;
    },
    enabled: !!tuitionId,
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tuitionInfo', tuitionId] });
  }, [queryClient, tuitionId]);

  return { tuition, loading: isLoading || tuitionIdLoading, refetch };
}
