import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, CreditCard, TrendingUp, Clock, CheckCircle, PenTool, AlertCircle, User, Building2, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminStats {
  totalColaboradores: number;
  contratosAtivos: number;
  pagamentosPendentes: number;
  pagamentosMes: number;
}

interface ColaboradorStats {
  meusContratos: number;
  contratosPendentesAssinatura: number;
  meusPagamentos: number;
}

interface PendingSignature {
  id: string;
  contractId: string;
  jobTitle: string;
  companyName: string;
  createdAt: string;
}

interface MyContract {
  id: string;
  jobTitle: string;
  contractType: string;
  status: string;
  startDate: string;
}

const DashboardOverview = () => {
  const { profile, roles, hasRole, user } = useAuth();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [colaboradorStats, setColaboradorStats] = useState<ColaboradorStats | null>(null);
  const [pendingSignatures, setPendingSignatures] = useState<PendingSignature[]>([]);
  const [myContracts, setMyContracts] = useState<MyContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = hasRole("admin");
  const isFinanceiro = hasRole("financeiro");
  const isGestor = hasRole("gestor");
  const isColaborador = hasRole("colaborador");
  const isJuridico = hasRole("juridico");
  const isMasterAdmin = hasRole("master_admin");

  // Determina se o usuário tem acesso administrativo
  const hasAdminAccess = isAdmin || isFinanceiro || isGestor || isJuridico || isMasterAdmin;

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.company_id && !user?.id) return;

      try {
        // Se for colaborador sem acesso admin, buscar dados do colaborador
        if (!hasAdminAccess && user?.id) {
          // Buscar contratos do colaborador
          const { data: contracts } = await supabase
            .from("contracts")
            .select(`
              id,
              job_title,
              contract_type,
              status,
              start_date,
              company_id,
              companies(name)
            `)
            .eq("user_id", user.id);

          // Buscar assinaturas pendentes
          const { data: signatures } = await supabase
            .from("contract_signatures")
            .select(`
              id,
              document_id,
              signed_at,
              contract_documents(
                contract_id,
                contracts(
                  id,
                  job_title,
                  company_id,
                  companies(name)
                )
              )
            `)
            .eq("signer_email", profile?.email || "")
            .is("signed_at", null);

          // Buscar pagamentos do colaborador
          const { count: pagamentosCount } = await supabase
            .from("payments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          const pendingSignaturesList: PendingSignature[] = (signatures || [])
            .filter((sig: any) => sig.contract_documents?.contracts)
            .map((sig: any) => ({
              id: sig.id,
              contractId: sig.contract_documents.contracts.id,
              jobTitle: sig.contract_documents.contracts.job_title,
              companyName: sig.contract_documents.contracts.companies?.name || "",
              createdAt: sig.contract_documents.contracts.created_at || "",
            }));

          const myContractsList: MyContract[] = (contracts || []).map((contract: any) => ({
            id: contract.id,
            jobTitle: contract.job_title,
            contractType: contract.contract_type,
            status: contract.status,
            startDate: contract.start_date,
          }));

          setPendingSignatures(pendingSignaturesList);
          setMyContracts(myContractsList);
          setColaboradorStats({
            meusContratos: contracts?.length || 0,
            contratosPendentesAssinatura: pendingSignaturesList.length,
            meusPagamentos: pagamentosCount || 0,
          });
        }

        // Se tiver acesso admin, buscar estatísticas da empresa
        if (hasAdminAccess && profile?.company_id) {
          const { count: colaboradoresCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("company_id", profile.company_id)
            .eq("is_active", true);

          const { count: contratosCount } = await supabase
            .from("contracts")
            .select("*", { count: "exact", head: true })
            .eq("company_id", profile.company_id)
            .eq("status", "active");

          const { count: pagamentosPendentesCount } = await supabase
            .from("payments")
            .select("*", { count: "exact", head: true })
            .eq("company_id", profile.company_id)
            .eq("status", "pending");

          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { data: pagamentosMes } = await supabase
            .from("payments")
            .select("amount")
            .eq("company_id", profile.company_id)
            .eq("status", "paid")
            .gte("payment_date", startOfMonth.toISOString());

          const totalPagamentosMes = pagamentosMes?.reduce(
            (sum, p) => sum + Number(p.amount),
            0
          ) || 0;

          setAdminStats({
            totalColaboradores: colaboradoresCount || 0,
            contratosAtivos: contratosCount || 0,
            pagamentosPendentes: pagamentosPendentesCount || 0,
            pagamentosMes: totalPagamentosMes,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.company_id, profile?.email, user?.id, hasAdminAccess]);

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
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

        <Card>
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

        <Card>
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

        <Card>
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
                  {formatCurrency(adminStats?.pagamentosMes || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total em pagamentos</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma atividade recente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return hasAdminAccess ? renderAdminView() : renderColaboradorView();
};

export default DashboardOverview;
