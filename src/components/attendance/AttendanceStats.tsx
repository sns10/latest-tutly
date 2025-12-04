import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface AttendanceStatsProps {
  stats: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

export function AttendanceStats({ stats }: AttendanceStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card className="bg-white shadow-sm border-slate-200">
        <CardContent className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold">{stats.totalStudents}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </CardContent>
      </Card>
      <Card className="bg-white shadow-sm border-slate-200">
        <CardContent className="p-4 text-center">
          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          <div className="text-sm text-muted-foreground">Present</div>
        </CardContent>
      </Card>
      <Card className="bg-white shadow-sm border-slate-200">
        <CardContent className="p-4 text-center">
          <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
          <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          <div className="text-sm text-muted-foreground">Absent</div>
        </CardContent>
      </Card>
      <Card className="bg-white shadow-sm border-slate-200">
        <CardContent className="p-4 text-center">
          <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
          <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          <div className="text-sm text-muted-foreground">Late</div>
        </CardContent>
      </Card>
      <Card className="bg-white shadow-sm border-slate-200">
        <CardContent className="p-4 text-center">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
          <div className="text-sm text-muted-foreground">Excused</div>
        </CardContent>
      </Card>
    </div>
  );
}
