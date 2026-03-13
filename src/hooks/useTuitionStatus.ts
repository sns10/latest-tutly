import { useTuitionData } from './useTuitionData';
import { useMemo } from 'react';

/**
 * Derives tuition status from the shared useTuitionData hook.
 * No additional API call — reads from the same cached query.
 */
export function useTuitionStatus() {
  const { tuition, loading, tuitionId } = useTuitionData();

  const status = useMemo(() => {
    if (!tuition) return null;
    return {
      isActive: tuition.is_active,
      subscriptionStatus: tuition.subscription_status,
      tuitionName: tuition.name,
    };
  }, [tuition]);

  const isOperational = status?.isActive && 
    (status?.subscriptionStatus === 'active' || status?.subscriptionStatus === 'trial');

  return { 
    status, 
    loading, 
    isOperational,
    tuitionId 
  };
}
