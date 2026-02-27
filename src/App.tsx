import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthPage } from "./components/AuthPage";
import { PrivacyPolicy } from "@/components/legal/PrivacyPolicy";
import { TermsOfService } from "@/components/legal/TermsOfService";
import { Footer } from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Loader2 } from "lucide-react";

// Retry wrapper for lazy imports to handle chunk loading failures on mobile
const lazyWithRetry = (componentImport: () => Promise<any>, retries = 3) =>
  lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        // On chunk load failure, try refreshing the page cache
        if (i === retries - 1) {
          // Last retry: check if it's a chunk error and reload
          const isChunkError = 
            error instanceof Error && 
            (error.message.includes('Failed to fetch dynamically imported module') ||
             error.message.includes('Loading chunk') ||
             error.message.includes('Loading CSS chunk'));
          
          if (isChunkError) {
            // Clear caches and reload on chunk errors
            window.location.reload();
          }
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Failed to load component after retries');
  });

// Lazy load heavy pages for faster initial load with retry logic
const Index = lazyWithRetry(() => import("./pages/Index"));
const SuperAdmin = lazyWithRetry(() => import("./pages/SuperAdmin"));
const Student = lazyWithRetry(() => import("./pages/Student"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Attendance = lazyWithRetry(() => import("./pages/Attendance"));
const Students = lazyWithRetry(() => import("./pages/Students"));
const Fees = lazyWithRetry(() => import("./pages/Fees"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Timetable = lazyWithRetry(() => import("./pages/Timetable"));
const Materials = lazyWithRetry(() => import("./pages/Materials"));
const Classes = lazyWithRetry(() => import("./pages/Classes"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const StudentRegistration = lazyWithRetry(() => import("./pages/StudentRegistration"));

// Optimized Query Client with production-ready defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - data is fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - cache lifetime (previously cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Disable aggressive refetching
      refetchOnReconnect: true, // Refetch when coming back online
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex items-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-muted-foreground">Loading...</span>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const isSuperAdminPage = location.pathname === '/super-admin';
  const isStudentPage = location.pathname.startsWith('/student');
  const isLegalPage = location.pathname === '/privacy' || location.pathname === '/terms';
  const isPublicRegistration = location.pathname.startsWith('/register');

  // Monitor network status
  useNetworkStatus();

  // Don't show sidebars on auth, super-admin, student, legal, or public registration pages
  const showSidebars = !isAuthPage && !isSuperAdminPage && !isStudentPage && !isLegalPage && !isPublicRegistration;

  return (
    <SidebarProvider>
        <div className="min-h-screen flex w-full overflow-x-hidden bg-background">
          {showSidebars && <AppSidebar />}
          <main className="flex-1 flex flex-col bg-background w-full min-w-0">
          {showSidebars && (
            <div className="border-b bg-white sticky top-0 z-40 shadow-sm">
              <div className="flex h-14 items-center px-3 sm:px-4">
                <SidebarTrigger className="md:hidden" />
              </div>
            </div>
          )}
          <div className={`flex-1 ${showSidebars ? 'pb-20 md:pb-0' : ''} bg-background w-full overflow-x-hidden flex flex-col`}>
            <div className="flex-1">
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/register/:tuitionSlug" element={<StudentRegistration />} />
                    <Route 
                      path="/super-admin" 
                      element={
                        <ProtectedRoute allowedRoles={['super_admin']}>
                          <SuperAdmin />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/student" 
                      element={
                        <ProtectedRoute allowedRoles={['student', 'parent']} allowPortalUsers={true}>
                          <Student />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/*" 
                      element={
                        <ProtectedRoute allowedRoles={['tuition_admin']}>
                          <Index />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </div>
            <Footer />
          </div>
        </main>
        {showSidebars && <BottomNav />}
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
