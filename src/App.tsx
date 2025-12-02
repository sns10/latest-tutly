
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SuperAdmin from "./pages/SuperAdmin";
import { AuthPage } from "./components/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <SidebarProvider>
            <div className="min-h-screen flex w-full overflow-x-hidden bg-[#f8f9fa]">
              <AppSidebar />
              <main className="flex-1 flex flex-col bg-[#f8f9fa] w-full min-w-0">
                <div className="border-b bg-white sticky top-0 z-40 shadow-sm">
                  <div className="flex h-14 items-center px-3 sm:px-4">
                    <SidebarTrigger className="md:hidden" />
                  </div>
                </div>
                <div className="flex-1 pb-20 md:pb-0 bg-[#f8f9fa] w-full overflow-x-hidden">
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
              <BottomNav />
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
