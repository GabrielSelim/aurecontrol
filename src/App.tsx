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
import RegistroMaster from "./pages/RegistroMaster";
import RecuperarSenha from "./pages/RecuperarSenha";
import AtualizarSenha from "./pages/AtualizarSenha";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Colaboradores from "./pages/dashboard/Colaboradores";
import Contratos from "./pages/dashboard/Contratos";
import Pagamentos from "./pages/dashboard/Pagamentos";
import Convites from "./pages/dashboard/Convites";
import Empresa from "./pages/dashboard/Empresa";
import Empresas from "./pages/dashboard/Empresas";
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
          <Route index element={<DashboardHome />} />
          <Route path="colaboradores" element={<Colaboradores />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="convites" element={<Convites />} />
          <Route path="empresa" element={<Empresa />} />
          <Route path="empresas" element={<Empresas />} />
          <Route path="assinaturas" element={<div className="text-center py-12 text-muted-foreground">Página de Assinaturas em desenvolvimento</div>} />
          <Route path="configuracoes" element={<div className="text-center py-12 text-muted-foreground">Página de Configurações em desenvolvimento</div>} />
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
      <Route path="/registro-master" element={<PublicRoute><RegistroMaster /></PublicRoute>} />
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
