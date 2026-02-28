import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, CreditCard, TrendingUp, Clock, CheckCircle, PenTool, AlertCircle, User, Building2, UserPlus, AlertTriangle, CalendarClock, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import { logger } from "@/lib/logger";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  useDashboardAdmin,
  useDashboardColaborador,
} from "@/hooks/queries";
import type {
  AdminStats,
  ColaboradorStats,
  PendingSignature,
  MyContract,
  DashboardAlert as Alert,
  RecentActivity,
  HealthData,
  NextAction,
} from "@/hooks/queries";

const DashboardOverview = () => {
  useDocumentTitle("Visão Geral");
  const { profile, hasRole, user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = hasRole("admin");
  const isFinanceiro = hasRole("financeiro");
  const isGestor = hasRole("gestor");
  const isColaborador = hasRole("colaborador");
  const isJuridico = hasRole("juridico");
  const isMasterAdmin = hasRole("master_admin");

  // Determina se o usuário tem acesso administrativo
  const hasAdminAccess = isAdmin || isFinanceiro || isGestor || isJuridico || isMasterAdmin;

  // ---- TanStack Query hooks ----
  const adminQuery = useDashboardAdmin(
    hasAdminAccess ? profile?.company_id : undefined
  );
  const colaboradorQuery = useDashboardColaborador(
    !hasAdminAccess ? user?.id : undefined,
    !hasAdminAccess ? profile?.email : undefined
  );

  // Derived data from queries
  const adminStats = adminQuery.data?.adminStats ?? null;
  const sparklineData = adminQuery.data?.sparklineData ?? [];
  const alerts = adminQuery.data?.alerts ?? [];
  const healthData = adminQuery.data?.healthData ?? null;
  const nextActions = adminQuery.data?.nextActions ?? [];
  const recentActivities = adminQuery.data?.recentActivities ?? [];

  const colaboradorStats = colaboradorQuery.data?.colaboradorStats ?? null;
  const pendingSignatures = colaboradorQuery.data?.pendingSignatures ?? [];
  const myContracts = colaboradorQuery.data?.myContracts ?? [];

  const isLoading = hasAdminAccess ? adminQuery.isLoading : colaboradorQuery.isLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getRoleLabel = () => {
    if (isMasterAdmin) return "Master Admin";
    if (isAdmin) return "Administrador";
    if (isFinanceiro) return "Financeiro";
    if (isGestor) return "Gestor";
    if (isJuridico) return "Jurídico";
    if (isColaborador) return "Colaborador";
    return "Usuário";
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CLT: "CLT",
      PJ: "PJ",
      estagio: "Estágio",
      temporario: "Temporário",
    };
    return labels[type] || type;
  };

  const getAuditLabel = (action: string) => {
    const labels: Record<string, string> = {
      contract_created: "Contrato criado",
      contract_updated: "Contrato atualizado",
      contract_status_changed: "Status alterado",
      document_generated: "Documento gerado",
      signature_requested: "Assinatura solicitada",
      signature_completed: "Assinatura realizada",
      contract_sent: "Contrato enviado",
      contract_completed: "Contrato assinado",
      pdf_downloaded: "PDF baixado",
    };
    return labels[action] || action;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      terminated: { label: "Encerrado", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Renderiza a visão para colaboradores
  const renderColaboradorView = () => (
    <div className="space-y-6">
      {/* Header com informações do colaborador */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Badge variant="outline">{getRoleLabel()}</Badge>
          </p>
        </div>
      </div>

      {/* Alerta de contratos pendentes de assinatura */}
      {pendingSignatures.length > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Contratos Aguardando sua Assinatura
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-500">
              Você tem {pendingSignatures.length} contrato(s) pendente(s) de assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSignatures.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <PenTool className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">{sig.jobTitle}</p>
                    <p className="text-sm text-muted-foreground">{sig.companyName}</p>
                  </div>
                </div>
                <Button asChild>
                  <Link to={`/dashboard/contratos/${sig.contractId}`}>
                    Assinar Contrato
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats do Colaborador */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{colaboradorStats?.meusContratos}</div>
                <p className="text-xs text-muted-foreground">Total de contratos</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes de Assinatura</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{colaboradorStats?.contratosPendentesAssinatura}</div>
                <p className="text-xs text-muted-foreground">Aguardando sua assinatura</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Pagamentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{colaboradorStats?.meusPagamentos}</div>
                <p className="text-xs text-muted-foreground">Registros de pagamento</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Contratos do Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Contratos</CardTitle>
          <CardDescription>Seus contratos ativos e histórico</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : myContracts.length > 0 ? (
            <div className="space-y-3">
              {myContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{contract.jobTitle}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{getContractTypeLabel(contract.contractType)}</Badge>
                        <span>•</span>
                        <span>Início: {format(new Date(contract.startDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(contract.status)}
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/dashboard/contratos/${contract.id}`}>Ver Detalhes</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Você ainda não possui contratos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas para Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse suas principais funções</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            to="/dashboard/perfil"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <User className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Meu Perfil</span>
          </Link>
          <Link
            to="/dashboard/contratos"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <FileText className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Meus Contratos</span>
          </Link>
          <Link
            to="/dashboard/pagamentos"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <CreditCard className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Meus Pagamentos</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  // Renderiza a visão para admins/gestores
  const renderAdminView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo, {profile?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está um resumo da sua empresa
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {getRoleLabel()}
        </Badge>
      </div>

      {/* Alertas Inteligentes */}
      {!isLoading && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`cursor-pointer transition-colors hover:shadow-md ${
                alert.type === "danger"
                  ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                  : alert.type === "warning"
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                  : "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
              }`}
              onClick={() => navigate(alert.link)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                {alert.type === "danger" ? (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : alert.type === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                ) : (
                  <CalendarClock className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
                <p className={`text-sm font-medium ${
                  alert.type === "danger" ? "text-red-700 dark:text-red-400"
                  : alert.type === "warning" ? "text-amber-700 dark:text-amber-400"
                  : "text-blue-700 dark:text-blue-400"
                }`}>
                  {alert.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate("/dashboard/colaboradores")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{adminStats?.totalColaboradores}</div>
                    <p className="text-xs text-muted-foreground">Ativos na empresa</p>
                  </>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Perfis com status ativo na empresa</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate("/dashboard/contratos")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{adminStats?.contratosAtivos}</div>
                    <p className="text-xs text-muted-foreground">Em vigência</p>
                  </>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Contratos com status "ativo"</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate("/dashboard/pagamentos")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{adminStats?.pagamentosPendentes}</div>
                    <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
                  </>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Pagamentos com status "pendente"</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate("/dashboard/pagamentos")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pago este mês</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {adminStats?.pagamentosMes ? formatCurrency(adminStats.pagamentosMes) : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">Total em pagamentos</p>
                    {sparklineData.length > 0 && (
                      <div className="mt-2 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sparklineData} barSize={10}>
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} opacity={0.6} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Soma dos pagamentos aprovados no mês atual</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate("/dashboard/contratos")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Previsto</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {adminStats?.custoPrevistoProximoMes ? formatCurrency(adminStats.custoPrevistoProximoMes) : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">Próximo mês (salários)</p>
                  </>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Soma dos salários dos contratos ativos</TooltipContent>
        </Tooltip>
      </div>
      </TooltipProvider>

      {/* Saúde da Empresa + Próximas Ações */}
      {!isLoading && (healthData || nextActions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Saúde da Empresa */}
          {healthData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Saúde da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-4xl font-bold ${healthData.color}`}>
                    {healthData.score}%
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className={
                        healthData.score >= 80
                          ? "border-green-400 text-green-700 dark:text-green-400"
                          : healthData.score >= 50
                          ? "border-amber-400 text-amber-700 dark:text-amber-400"
                          : "border-red-400 text-red-700 dark:text-red-400"
                      }
                    >
                      {healthData.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Baseado em contratos e pagamentos
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  {healthData.details.map((detail, i) => (
                    <p key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                        healthData.score >= 80 ? "bg-green-500" : healthData.score >= 50 ? "bg-amber-500" : "bg-red-500"
                      }`} />
                      {detail}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Próximas Ações */}
          {nextActions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" />
                  Próximas Ações
                </CardTitle>
                <CardDescription>Tarefas pendentes que precisam da sua atenção</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextActions.map((action) => (
                  <Link
                    key={action.id}
                    to={action.link}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {action.icon === "payment" ? (
                        <CreditCard className="h-4 w-4 text-primary" />
                      ) : action.icon === "contract" ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : (
                        <Users className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse rapidamente as principais funções</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {(isAdmin || isGestor) && (
              <Link
                to="/dashboard/colaboradores"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Users className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Ver Colaboradores</span>
              </Link>
            )}
            {(isAdmin || isGestor || isJuridico) && (
              <Link
                to="/dashboard/contratos"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <FileText className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Gerenciar Contratos</span>
              </Link>
            )}
            {(isAdmin || isFinanceiro) && (
              <Link
                to="/dashboard/pagamentos"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <CreditCard className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Ver Pagamentos</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/dashboard/convites"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <UserPlus className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Convidar Usuário</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/dashboard/empresa"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Building2 className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Dados da Empresa</span>
              </Link>
            )}
            <Link
              to="/dashboard/perfil"
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <User className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Meu Perfil</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas ações na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getAuditLabel(activity.action)}
                        {activity.contractJobTitle && (
                          <span className="text-muted-foreground font-normal"> — {activity.contractJobTitle}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.actorName} • {format(new Date(activity.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atividade recente</p>
                <p className="text-xs mt-1">As atividades aparecerão aqui conforme ações forem realizadas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return hasAdminAccess ? renderAdminView() : renderColaboradorView();
};

export default DashboardOverview;
