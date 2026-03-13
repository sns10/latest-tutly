import { useTuitionData } from './useTuitionData';
import { useMemo } from 'react';

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

/**
 * Derives features from the shared useTuitionData hook.
 * No additional API call — reads from the same cached query.
 */
export function useTuitionFeatures() {
  const { tuition, loading } = useTuitionData();

  const features = useMemo(() => {
    if (!tuition?.features) return ALL_FEATURES.map(f => f.key);
    return tuition.features;
  }, [tuition?.features]);

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    return features.includes(featureKey);
  };

  return { 
    features, 
    loading, 
    isFeatureEnabled 
  };
}
