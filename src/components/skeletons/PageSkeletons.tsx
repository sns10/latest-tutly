import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Reusable skeleton components
export const StatCardSkeleton = () => (
  <Card>
    <CardContent className="p-3 text-center">
      <Skeleton className="h-5 w-5 mx-auto mb-1 rounded" />
      <Skeleton className="h-6 w-12 mx-auto mb-1" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </CardContent>
  </Card>
);

export const StudentRowSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 min-w-0 space-y-2">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
    <div className="text-right space-y-1">
      <Skeleton className="h-4 w-12 ml-auto" />
      <Skeleton className="h-5 w-8 ml-auto rounded-full" />
    </div>
  </div>
);

export const StudentListSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <StudentRowSkeleton key={i} />
    ))}
  </div>
);

export const StudentsPageSkeleton = () => (
  <div className="w-full px-3 py-4 sm:px-6 space-y-4">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>

    {/* Search and Filters */}
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Statistics */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>

    {/* Student List */}
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <StudentListSkeleton count={10} />
      </CardContent>
    </Card>
  </div>
);

export const FeeCardSkeleton = () => (
  <Card>
    <CardContent className="p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </CardContent>
  </Card>
);

export const FeeDashboardSkeleton = () => (
  <div className="space-y-4">
    {/* Summary Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Charts */}
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

export const FeesPageSkeleton = () => (
  <div className="w-full px-3 py-4 sm:px-6 space-y-4">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>

    {/* Tabs */}
    <Skeleton className="h-10 w-full" />

    {/* Content */}
    <FeeDashboardSkeleton />
  </div>
);

export const TimetableGridSkeleton = () => (
  <div className="space-y-4">
    {/* Day headers */}
    <div className="grid grid-cols-6 gap-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
    
    {/* Time slots */}
    {Array.from({ length: 6 }).map((_, row) => (
      <div key={row} className="grid grid-cols-6 gap-2">
        <Skeleton className="h-16 w-full" />
        {Array.from({ length: 5 }).map((_, col) => (
          <Skeleton key={col} className="h-16 w-full" />
        ))}
      </div>
    ))}
  </div>
);

export const TimetablePageSkeleton = () => (
  <div className="w-full px-3 py-4 sm:px-6 space-y-4">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>

    {/* Filters */}
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>

    {/* Timetable Grid */}
    <Card>
      <CardContent className="p-4">
        <TimetableGridSkeleton />
      </CardContent>
    </Card>
  </div>
);

export const ReportsSkeleton = () => (
  <div className="w-full px-3 py-4 sm:px-4 space-y-4">
    {/* Header */}
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className="h-6 w-6 rounded" />
      <Skeleton className="h-7 w-24" />
    </div>

    {/* Tabs */}
    <Skeleton className="h-10 w-full max-w-md" />

    {/* Content */}
    <Card>
      <CardHeader>
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex gap-2 p-2 bg-muted rounded-md">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="flex gap-2 p-2">
        {Array.from({ length: cols }).map((_, col) => (
          <Skeleton key={col} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
