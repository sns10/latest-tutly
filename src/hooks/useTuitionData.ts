import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';
import { FeatureKey, ALL_FEATURES } from './useTuitionFeatures';

export interface TuitionData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  portal_email: string | null;
  subscription_end_date: string | null;
  is_active: boolean;
  subscription_status: string;
  features: FeatureKey[] | null;
}

/**
 * Single consolidated hook that fetches ALL tuition data in one query.
 * Replaces separate useTuitionInfo, useTuitionFeatures, and useTuitionStatus hooks.
 */
export function useTuitionData() {
  const { tuitionId, loading: tuitionIdLoading } = useUserTuition();

  const { data: tuition = null, isLoading } = useQuery({
    queryKey: ['tuitionData', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return null;

      const { data, error } = await supabase
        .from('tuitions')
        .select('id, name, email, phone, address, logo_url, portal_email, subscription_end_date, is_active, subscription_status, features')
        .eq('id', tuitionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tuition data:', error);
        return null;
      }

      if (!data) return null;

      return {
        ...data,
        features: data.features && Array.isArray(data.features) && data.features.length > 0
          ? data.features as FeatureKey[]
          : ALL_FEATURES.map(f => f.key),
      } as TuitionData;
    },
    enabled: !!tuitionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  return { tuition, loading: isLoading || tuitionIdLoading, tuitionId };
}
