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
import AssinarContrato from "./pages/AssinarContrato";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Colaboradores from "./pages/dashboard/Colaboradores";
import ColaboradorEditar from "./pages/dashboard/ColaboradorEditar";
import ColaboradorDetalhes from "./pages/dashboard/ColaboradorDetalhes";
import Contratos from "./pages/dashboard/Contratos";
import ContratoDetalhes from "./pages/dashboard/ContratoDetalhes";
import ContratoDocumento from "./pages/dashboard/ContratoDocumento";
import ContratosFaturaveis from "./pages/dashboard/ContratosFaturaveis";
import TemplatesContrato from "./pages/dashboard/TemplatesContrato";
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
          {/* Rotas acessíveis a todos os usuários autenticados */}
          <Route index element={<DashboardHome />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="perfil" element={<Perfil />} />
          
          {/* Rotas de colaboradores - admin, gestor, financeiro */}
          <Route path="colaboradores" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "gestor", "financeiro"]}>
              <Colaboradores />
            </ProtectedRoute>
          } />
          <Route path="colaboradores/:id" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "gestor", "financeiro"]}>
              <ColaboradorDetalhes />
            </ProtectedRoute>
          } />
          <Route path="colaboradores/:id/editar" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "gestor"]}>
              <ColaboradorEditar />
            </ProtectedRoute>
          } />
          
          {/* Rotas de contratos - admin, gestor, juridico, financeiro */}
          <Route path="contratos" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "gestor", "juridico", "financeiro"]}>
              <Contratos />
            </ProtectedRoute>
          } />
          <Route path="contratos/:id" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "gestor", "juridico", "financeiro", "colaborador"]}>
              <ContratoDetalhes />
            </ProtectedRoute>
          } />
          <Route path="contratos/:id/documento" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "gestor", "juridico", "colaborador"]}>
              <ContratoDocumento />
            </ProtectedRoute>
          } />
          
          {/* Templates de contrato - admin, juridico */}
          <Route path="templates-contrato" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "juridico"]}>
              <TemplatesContrato />
            </ProtectedRoute>
          } />
          
          {/* Contratos faturáveis - master_admin */}
          <Route path="contratos-faturaveis" element={
            <ProtectedRoute requiredRoles={["master_admin"]}>
              <ContratosFaturaveis />
            </ProtectedRoute>
          } />
          
          {/* Pagamentos - admin, financeiro */}
          <Route path="pagamentos" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "financeiro"]}>
              <Pagamentos />
            </ProtectedRoute>
          } />
          
          {/* Convites - admin */}
          <Route path="convites" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin"]}>
              <Convites />
            </ProtectedRoute>
          } />
          
          {/* Empresa - admin */}
          <Route path="empresa" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin"]}>
              <Empresa />
            </ProtectedRoute>
          } />
          
          {/* Rotas exclusivas do master_admin */}
          <Route path="empresas" element={
            <ProtectedRoute requiredRoles={["master_admin"]}>
              <Empresas />
            </ProtectedRoute>
          } />
          <Route path="empresas/:id" element={
            <ProtectedRoute requiredRoles={["master_admin"]}>
              <EmpresaDetalhes />
            </ProtectedRoute>
          } />
          <Route path="faturamento" element={
            <ProtectedRoute requiredRoles={["master_admin"]}>
              <Faturamento />
            </ProtectedRoute>
          } />
          <Route path="configuracoes" element={
            <ProtectedRoute requiredRoles={["master_admin"]}>
              <Configuracoes />
            </ProtectedRoute>
          } />
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
      <Route path="/assinar-contrato" element={<AssinarContrato />} />
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
