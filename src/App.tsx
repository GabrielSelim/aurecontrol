import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PJLayout } from "@/components/pj/PJLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PageLoader } from "@/components/PageLoader";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazy-loaded pages — each becomes its own chunk
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Registro = lazy(() => import("./pages/Registro"));
const RegistroMaster = lazy(() => import("./pages/RegistroMaster"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha"));
const AtualizarSenha = lazy(() => import("./pages/AtualizarSenha"));
const Precos = lazy(() => import("./pages/Precos"));
const AssinarContrato = lazy(() => import("./pages/AssinarContrato"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Dashboard pages
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const Colaboradores = lazy(() => import("./pages/dashboard/Colaboradores"));
const ColaboradorEditar = lazy(() => import("./pages/dashboard/ColaboradorEditar"));
const ColaboradorDetalhes = lazy(() => import("./pages/dashboard/ColaboradorDetalhes"));
const Contratos = lazy(() => import("./pages/dashboard/Contratos"));
const ContratoDetalhes = lazy(() => import("./pages/dashboard/ContratoDetalhes"));
const ContratoDocumento = lazy(() => import("./pages/dashboard/ContratoDocumento"));
const ContratosFaturaveis = lazy(() => import("./pages/dashboard/ContratosFaturaveis"));
const TemplatesContrato = lazy(() => import("./pages/dashboard/TemplatesContrato"));
const TemplateEditorFullscreen = lazy(() => import("./pages/dashboard/TemplateEditorFullscreen"));
const Pagamentos = lazy(() => import("./pages/dashboard/Pagamentos"));
const Convites = lazy(() => import("./pages/dashboard/Convites"));
const Empresa = lazy(() => import("./pages/dashboard/Empresa"));
const Empresas = lazy(() => import("./pages/dashboard/Empresas"));
const NovaEmpresa = lazy(() => import("./pages/dashboard/NovaEmpresa"));
const Configuracoes = lazy(() => import("./pages/dashboard/Configuracoes"));
const Faturamento = lazy(() => import("./pages/dashboard/Faturamento"));
const EmpresaDetalhes = lazy(() => import("./pages/dashboard/EmpresaDetalhes"));
const Notificacoes = lazy(() => import("./pages/dashboard/Notificacoes"));
const Perfil = lazy(() => import("./pages/dashboard/Perfil"));
const Auditoria = lazy(() => import("./pages/dashboard/Auditoria"));

// PJ portal pages
const BemVindo = lazy(() => import("./pages/BemVindo"));
const PJDashboard = lazy(() => import("./pages/pj/PJDashboard"));
const PJContratos = lazy(() => import("./pages/pj/PJContratos"));
const PJContratoView = lazy(() => import("./pages/pj/PJContratoView"));
const PJPagamentos = lazy(() => import("./pages/pj/PJPagamentos"));
const PJPerfil = lazy(() => import("./pages/pj/PJPerfil"));
const PJDocumentos = lazy(() => import("./pages/pj/PJDocumentos"));
const PJNotasFiscais = lazy(() => import("./pages/pj/PJNotasFiscais"));
const ColaboradorExtrato = lazy(() => import("./pages/dashboard/ColaboradorExtrato"));
const LGPD = lazy(() => import("./pages/dashboard/LGPD"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — data stays fresh
      gcTime: 10 * 60 * 1000,         // 10 min — unused cache lives
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isPJ, profile } = useAuth();
  if (isLoading) return null;
  if (user) {
    if (isPJ) {
      const onboardingDone = (profile as any)?.pj_onboarding_done;
      return <Navigate to={onboardingDone ? "/pj/dashboard" : "/bem-vindo"} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function DashboardRoutes() {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rotas acessíveis a todos os usuários autenticados */}
          <Route index element={<DashboardHome />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="lgpd" element={<LGPD />} />
          
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
          <Route path="colaboradores/:id/extrato" element={
            <ProtectedRoute requiredRoles={["master_admin", "admin", "financeiro"]}>
              <ColaboradorExtrato />
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
          <Route path="empresas/nova" element={
            <ProtectedRoute requiredRoles={["master_admin"]}>
              <NovaEmpresa />
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
          <Route path="auditoria" element={
            <ProtectedRoute requiredRoles={["master_admin"]}>
              <Auditoria />
            </ProtectedRoute>
          } />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/precos" element={<Precos />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/registro" element={<PublicRoute><Registro /></PublicRoute>} />
      <Route path="/registro-master" element={<PublicRoute><RegistroMaster /></PublicRoute>} />
      <Route path="/recuperar-senha" element={<PublicRoute><RecuperarSenha /></PublicRoute>} />
      <Route path="/atualizar-senha" element={<AtualizarSenha />} />
      <Route path="/assinar-contrato" element={<AssinarContrato />} />
      <Route path="/dashboard/templates-contrato/:id/editar" element={
        <ProtectedRoute requiredRoles={["master_admin", "admin", "juridico"]}>
          <Suspense fallback={<PageLoader />}>
            <TemplateEditorFullscreen />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/*" element={<DashboardRoutes />} />
      <Route path="/bem-vindo" element={
        <ProtectedRoute requiredRoles={["pj"]}>
          <BemVindo />
        </ProtectedRoute>
      } />
      <Route path="/pj/*" element={
        <ProtectedRoute requiredRoles={["pj"]}>
          <PJLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="dashboard" element={<PJDashboard />} />
                <Route path="contratos" element={<PJContratos />} />
                <Route path="contratos/:id" element={<PJContratoView />} />
                <Route path="pagamentos" element={<PJPagamentos />} />
                <Route path="documentos" element={<PJDocumentos />} />
                <Route path="notas-fiscais" element={<PJNotasFiscais />} />
                <Route path="perfil" element={<PJPerfil />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Routes>
            </Suspense>
          </PJLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
