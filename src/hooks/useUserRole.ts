import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export type UserRole = 'super_admin' | 'tuition_admin' | 'student' | 'parent' | null;

export function useUserRole() {
  const { user } = useAuth();

  const { data: role = null, isLoading: loading } = useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      return (data?.role as UserRole) ?? null;
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes — role rarely changes
    gcTime: 60 * 60 * 1000,
  });

  return { role, loading };
}
