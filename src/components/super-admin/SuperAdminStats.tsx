import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, GraduationCap, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminStatsProps {
  tuitions: any[];
}

export function SuperAdminStats({ tuitions }: SuperAdminStatsProps) {
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [totalFaculty, setTotalFaculty] = useState<number | null>(null);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const [studentsRes, facultyRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('faculty').select('id', { count: 'exact', head: true }),
      ]);
      setTotalStudents(studentsRes.count || 0);
      setTotalFaculty(facultyRes.count || 0);
    } catch (error) {
      console.error('Error fetching global stats:', error);
    }
  };

  const activeTuitions = tuitions.filter(t => t.is_active).length;
  const inactiveTuitions = tuitions.filter(t => !t.is_active).length;
  const activeSubscriptions = tuitions.filter(t => t.subscription_status === 'active').length;

  const stats = [
    {
      title: 'Total Tuitions',
      value: tuitions.length,
      icon: Building2,
      description: `${activeTuitions} active, ${inactiveTuitions} inactive`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions,
      icon: DollarSign,
      description: 'Paying customers',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Total Students',
      value: totalStudents ?? '—',
      icon: Users,
      description: 'Across all tuitions',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Total Faculty',
      value: totalFaculty ?? '—',
      icon: GraduationCap,
      description: 'Across all tuitions',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {stat.title}
            </CardTitle>
            <div className={`${stat.bg} p-2 rounded-lg`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
