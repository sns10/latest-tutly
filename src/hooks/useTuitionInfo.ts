import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTuitionData } from './useTuitionData';

/**
 * Derives tuition info from the shared useTuitionData hook.
 * No additional API call — reads from the same cached query.
 */
export function useTuitionInfo() {
  const { tuition, loading, tuitionId } = useTuitionData();
  const queryClient = useQueryClient();

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tuitionData', tuitionId] });
  }, [queryClient, tuitionId]);

  return { tuition, loading, refetch };
}
