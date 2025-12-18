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
import Precos from "./pages/Precos";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Colaboradores from "./pages/dashboard/Colaboradores";
import ColaboradorEditar from "./pages/dashboard/ColaboradorEditar";
import ColaboradorDetalhes from "./pages/dashboard/ColaboradorDetalhes";
import Contratos from "./pages/dashboard/Contratos";
import ContratoDetalhes from "./pages/dashboard/ContratoDetalhes";
import Pagamentos from "./pages/dashboard/Pagamentos";
import Convites from "./pages/dashboard/Convites";
import Empresa from "./pages/dashboard/Empresa";
import Empresas from "./pages/dashboard/Empresas";
import Configuracoes from "./pages/dashboard/Configuracoes";
import Faturamento from "./pages/dashboard/Faturamento";
import EmpresaDetalhes from "./pages/dashboard/EmpresaDetalhes";
import Notificacoes from "./pages/dashboard/Notificacoes";
import Perfil from "./pages/dashboard/Perfil";
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
          <Route path="colaboradores/:id" element={<ColaboradorDetalhes />} />
          <Route path="colaboradores/:id/editar" element={<ColaboradorEditar />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="contratos/:id" element={<ContratoDetalhes />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="convites" element={<Convites />} />
          <Route path="empresa" element={<Empresa />} />
          <Route path="empresas" element={<Empresas />} />
          <Route path="empresas/:id" element={<EmpresaDetalhes />} />
          <Route path="faturamento" element={<Faturamento />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="perfil" element={<Perfil />} />
        </Routes>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/precos" element={<Precos />} />
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
