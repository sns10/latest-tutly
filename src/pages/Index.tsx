import { lazy, Suspense, useState, memo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTuitionInfo } from "@/hooks/useTuitionInfo";
import { useUserTuition } from "@/hooks/useUserTuition";
import { useTuitionFeatures } from "@/hooks/useTuitionFeatures";
import { ManagementCards } from "@/components/ManagementCards";
import { QuickActions } from "@/components/QuickActions";
import { FeatureGate } from "@/components/FeatureGate";
import { PortalEmailConfig } from "@/components/PortalEmailConfig";
import { TuitionBranding } from "@/components/TuitionBranding";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Share2, Check, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Lazy load ALL sub-components for faster initial load
const LeaderboardPage = lazy(() => import('./Leaderboard'));
const MaterialsPage = lazy(() => import('./Materials'));
const FeesPage = lazy(() => import('./Fees'));
const AttendancePage = lazy(() => import('./Attendance'));
const TimetablePage = lazy(() => import('./Timetable'));
const ClassesPage = lazy(() => import('./Classes'));
const StudentsPage = lazy(() => import('./Students'));
const ReportsPage = lazy(() => import('./Reports'));
const TestsPage = lazy(() => import('./Tests'));
const BackupDashboard = lazy(() => import('@/components/BackupDashboard').then(m => ({ default: m.BackupDashboard })));
const HomeworkManager = lazy(() => import('@/components/HomeworkManager').then(m => ({ default: m.HomeworkManager })));

// Minimal loading component
const RouteLoader = memo(() => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
));
RouteLoader.displayName = 'RouteLoader';

// Small inline loader
const SmallLoader = memo(() => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
));
SmallLoader.displayName = 'SmallLoader';

// Dashboard component - memoized to prevent re-renders
const Dashboard = memo(() => {
  const { signOut } = useAuth();
  const { tuition, refetch: refetchTuition } = useTuitionInfo();
  const { tuitionId } = useUserTuition();
  const { isFeatureEnabled } = useTuitionFeatures();
  const [copied, setCopied] = useState(false);
  
  // Use lightweight hooks for counts
  const { data: stats, isLoading: statsLoading } = useDashboardData();
  

  const handleSharePortalLink = () => {
    const portalUrl = `${window.location.origin}/student`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Student portal link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const attendancePercent = stats?.todayAttendance.total 
    ? Math.round((stats.todayAttendance.present / stats.todayAttendance.total) * 100)
    : 0;

  return (
    <div className="w-full px-3 py-4 sm:px-4 space-y-3 sm:space-y-4 bg-[#f8f9fa]">
      <div className="flex items-center justify-between mb-4 gap-2">
        <TuitionBranding 
          name={tuition?.name || 'Dashboard'} 
          logoUrl={tuition?.logo_url}
        />
        <div className="flex items-center gap-2">
          {tuitionId && (
            <PortalEmailConfig
              tuitionId={tuitionId}
              currentEmail={tuition?.portal_email}
              onUpdate={refetchTuition}
            />
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSharePortalLink}
            className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share Portal'}</span>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
                <SheetDescription>
                  Manage your tuition center settings and backups
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <Suspense fallback={<SmallLoader />}>
                  <BackupDashboard />
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
      
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <ManagementCards 
          testsCount={stats?.testsCount || 0}
          studentsCount={stats?.studentsCount || 0}
          attendanceToday={attendancePercent}
          pendingFees={stats?.pendingFeesCount || 0}
          activeChallenges={stats?.activeChallengesCount || 0}
        />
      )}

      <QuickActions />

      {/* Homework Manager - Feature Gated - Lazy loaded */}
      {isFeatureEnabled('homework') && (
        <Suspense fallback={<SmallLoader />}>
          <HomeworkManager />
        </Suspense>
      )}
    </div>
  );
});
Dashboard.displayName = 'Dashboard';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: featuresLoading } = useTuitionFeatures();

  if (authLoading || featuresLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tests" element={
        <Suspense fallback={<RouteLoader />}>
          <TestsPage />
        </Suspense>
      } />
      <Route path="/leaderboard" element={
        <FeatureGate featureKey="leaderboard" featureName="Leaderboard">
          <Suspense fallback={<RouteLoader />}>
            <LeaderboardPage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/materials" element={
        <FeatureGate featureKey="materials" featureName="Materials">
          <Suspense fallback={<RouteLoader />}>
            <MaterialsPage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/fees" element={
        <FeatureGate featureKey="fees" featureName="Fees">
          <Suspense fallback={<RouteLoader />}>
            <FeesPage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/attendance" element={
        <FeatureGate featureKey="attendance" featureName="Attendance">
          <Suspense fallback={<RouteLoader />}>
            <AttendancePage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/timetable" element={
        <FeatureGate featureKey="timetable" featureName="Timetable">
          <Suspense fallback={<RouteLoader />}>
            <TimetablePage />
          </Suspense>
        </FeatureGate>
      } />
      <Route path="/classes" element={
        <Suspense fallback={<RouteLoader />}>
          <ClassesPage />
        </Suspense>
      } />
      <Route path="/students" element={
        <Suspense fallback={<RouteLoader />}>
          <StudentsPage />
        </Suspense>
      } />
      <Route path="/reports" element={
        <FeatureGate featureKey="reports" featureName="Reports">
          <Suspense fallback={<RouteLoader />}>
            <ReportsPage />
          </Suspense>
        </FeatureGate>
      } />
    </Routes>
  );
};

export default Index;
