
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index";
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
            <div className="min-h-screen flex w-full bg-background">
              <AppSidebar />
              <main className="flex-1 flex flex-col">
                <div className="border-b bg-card sticky top-0 z-40">
                  <div className="flex h-14 items-center px-4">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold ml-2">Gamify Pallikoodam</h1>
                  </div>
                </div>
                <div className="flex-1 pb-16 md:pb-0">
                  <Routes>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/*" element={<Index />} />
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
