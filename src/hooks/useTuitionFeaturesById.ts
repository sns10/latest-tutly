import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ALL_FEATURES, FeatureKey } from './useTuitionFeatures';

export function useTuitionFeaturesById(tuitionId: string | null | undefined) {
  const [features, setFeatures] = useState<FeatureKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      if (!tuitionId) {
        // Default all features enabled if no tuition
        setFeatures(ALL_FEATURES.map(f => f.key));
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tuitions')
          .select('features')
          .eq('id', tuitionId)
          .maybeSingle();

        if (error) throw error;

        if (data?.features && Array.isArray(data.features) && data.features.length > 0) {
          setFeatures(data.features as FeatureKey[]);
        } else {
          // Default all features enabled if no features configured
          setFeatures(ALL_FEATURES.map(f => f.key));
        }
      } catch (error) {
        console.error('Error fetching tuition features:', error);
        setFeatures(ALL_FEATURES.map(f => f.key));
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [tuitionId]);

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    return features.includes(featureKey);
  };

  return { 
    features, 
    loading, 
    isFeatureEnabled 
  };
}
