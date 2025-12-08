import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SuperAdmin from "./pages/SuperAdmin";
import Student from "./pages/Student";
import { AuthPage } from "./components/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const isSuperAdminPage = location.pathname === '/super-admin';
  const isStudentPage = location.pathname === '/student';

  // Don't show sidebars on auth, super-admin, or student pages
  const showSidebars = !isAuthPage && !isSuperAdminPage && !isStudentPage;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden bg-[#f8f9fa]">
        {showSidebars && <AppSidebar />}
        <main className="flex-1 flex flex-col bg-[#f8f9fa] w-full min-w-0">
          {showSidebars && (
            <div className="border-b bg-white sticky top-0 z-40 shadow-sm">
              <div className="flex h-14 items-center px-3 sm:px-4">
                <SidebarTrigger className="md:hidden" />
              </div>
            </div>
          )}
          <div className={`flex-1 ${showSidebars ? 'pb-20 md:pb-0' : ''} bg-[#f8f9fa] w-full overflow-x-hidden`}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
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
          </div>
        </main>
        {showSidebars && <BottomNav />}
      </div>
    </SidebarProvider>
  );
}

const App = () => (
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
);

export default App;
