import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import RecuperarSenha from "./pages/RecuperarSenha";
import AtualizarSenha from "./pages/AtualizarSenha";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import Colaboradores from "./pages/dashboard/Colaboradores";
import Contratos from "./pages/dashboard/Contratos";
import Pagamentos from "./pages/dashboard/Pagamentos";
import Convites from "./pages/dashboard/Convites";
import Empresa from "./pages/dashboard/Empresa";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="colaboradores" element={<Colaboradores />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="convites" element={<Convites />} />
          <Route path="empresa" element={<Empresa />} />
        </Routes>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/registro" element={<PublicRoute><Registro /></PublicRoute>} />
      <Route path="/recuperar-senha" element={<PublicRoute><RecuperarSenha /></PublicRoute>} />
      <Route path="/atualizar-senha" element={<AtualizarSenha />} />
      <Route path="/dashboard/*" element={<DashboardRoutes />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
