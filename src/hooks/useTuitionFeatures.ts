import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserTuition } from './useUserTuition';

export type FeatureKey = 
  | 'leaderboard' 
  | 'materials' 
  | 'timetable' 
  | 'attendance' 
  | 'fees' 
  | 'announcements' 
  | 'challenges' 
  | 'student_portal'
  | 'reports'
  | 'term_exams'
  | 'homework'
  | 'gamification'
  | 'bulk_import'
  | 'whatsapp_alerts'
  | 'scheduling';

export type FeatureTier = 'core' | 'standard' | 'premium';

export interface FeatureConfig {
  key: FeatureKey;
  label: string;
  tier: FeatureTier;
  description?: string;
}

export const ALL_FEATURES: FeatureConfig[] = [
  // Core Features
  { key: 'attendance', label: 'Attendance', tier: 'core', description: 'Track student attendance' },
  { key: 'fees', label: 'Fees', tier: 'core', description: 'Manage fee collection' },
  { key: 'student_portal', label: 'Student Portal', tier: 'core', description: 'Student/parent access portal' },
  
  // Standard Features
  { key: 'timetable', label: 'Timetable', tier: 'standard', description: 'Weekly class schedules' },
  { key: 'materials', label: 'Materials', tier: 'standard', description: 'Upload study materials' },
  { key: 'homework', label: 'Homework', tier: 'standard', description: 'Assign homework to students' },
  { key: 'announcements', label: 'Announcements', tier: 'standard', description: 'Post announcements' },
  { key: 'leaderboard', label: 'Leaderboard', tier: 'standard', description: 'Student rankings' },
  { key: 'gamification', label: 'Gamification (XP)', tier: 'standard', description: 'XP points & attendance streaks' },
  
  // Premium Features
  { key: 'reports', label: 'Reports', tier: 'premium', description: 'Advanced report generation' },
  { key: 'term_exams', label: 'Term Exams', tier: 'premium', description: 'Multi-subject term examinations' },
  { key: 'bulk_import', label: 'Bulk Import', tier: 'premium', description: 'Excel import for students & marks' },
  { key: 'whatsapp_alerts', label: 'WhatsApp Alerts', tier: 'premium', description: 'Formatted absence messages' },
  { key: 'scheduling', label: 'Room Scheduling', tier: 'premium', description: 'Room management & conflict detection' },
  { key: 'challenges', label: 'Challenges', tier: 'premium', description: 'Student challenges & rewards' },
];

export function useTuitionFeatures() {
  const { tuitionId, loading: tuitionLoading } = useUserTuition();
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

    if (!tuitionLoading) {
      fetchFeatures();
    }
  }, [tuitionId, tuitionLoading]);

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    return features.includes(featureKey);
  };

  return { 
    features, 
    loading: loading || tuitionLoading, 
    isFeatureEnabled 
  };
}
