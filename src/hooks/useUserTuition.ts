import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export function useUserTuition() {
  const { user } = useAuth();

  const { data: tuitionId = null, isLoading: loading } = useQuery({
    queryKey: ['userTuitionId', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('tuition_id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tuition_id:', error);
        return null;
      }
      return data?.tuition_id || null;
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return { tuitionId, loading };
}
