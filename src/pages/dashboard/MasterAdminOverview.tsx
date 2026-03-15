import { useAuth } from "@/contexts/AuthContext";
import {
  useMasterAdminOverview,
  type MasterAdminGlobalStats,
  type RecentCompanyWithCounts,
} from "@/hooks/queries/useCompanyQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, CreditCard, Plus, Eye, TrendingUp, AlertCircle, ChevronRight, X, PartyPopper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState, useEffect } from "react";

type GlobalStats = MasterAdminGlobalStats;
type Company = RecentCompanyWithCounts;

const TOUR_KEY = "master_admin_tour_done_v1";

const TOUR_STEPS = [
  {
    title: "Bem-vindo ao Aure! 🎉",
    description: "Este é o seu painel Master Admin. Vamos fazer um tour rápido pelas principais funcionalidades.",
    action: null,
    actionLabel: null,
  },
  {
    title: "Empresas",
    description: "Cadastre e gerencie as empresas clientes. Cada empresa tem seu próprio conjunto de colaboradores, contratos e pagamentos.",
    action: "/dashboard/empresas",
    actionLabel: "Ir para Empresas",
  },
  {
    title: "Contratos PJ Faturáveis",
    description: "Acompanhe todos os contratos PJ ativos em todas as empresas. Use para controle de faturamento mensal.",
    action: "/dashboard/contratos-faturaveis",
    actionLabel: "Ver Contratos PJ",
  },
  {
    title: "Faturamento",
    description: "Controle os planos e faturamento de cada empresa cliente. Veja o histórico e projeções de receita.",
    action: "/dashboard/faturamento",
    actionLabel: "Ver Faturamento",
  },
  {
    title: "Auditoria & LGPD",
    description: "Acesse os logs de auditoria do sistema e gerencie solicitações LGPD de exclusão de dados.",
    action: "/dashboard/auditoria",
    actionLabel: "Ver Auditoria",
  },
];

function OnboardingTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleNavigate = () => {
    if (current.action) {
      onDone();
      navigate(current.action);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{current.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onDone} className="h-7 w-7 -mr-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 mt-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{step + 1} de {TOUR_STEPS.length}</span>
            <div className="flex gap-2">
              {current.action && (
                <Button variant="outline" size="sm" onClick={handleNavigate}>
                  {current.actionLabel}
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="gap-1">
                {isLast ? "Concluir" : "Próximo"}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const MasterAdminOverview = () => {
  const { profile } = useAuth();
  useDocumentTitle("Painel Master Admin");
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setShowTour(true);
  }, []);

  const handleTourDone = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setShowTour(false);
  };

  // --- TanStack Query -------------------------------------------------------
  const overviewQuery = useMasterAdminOverview();

  // Derived server state
  const stats = overviewQuery.data?.stats ?? null;
  const companies = overviewQuery.data?.companies ?? [];
  const isLoading = overviewQuery.isLoading;

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, "");
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {showTour && <OnboardingTour onDone={handleTourDone} />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Painel de administração do sistema Aure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTour(true)} className="gap-1">
            <PartyPopper className="h-4 w-4" />
            Tour
          </Button>
          <Button onClick={() => navigate("/dashboard/empresas/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalCompanies}</div>
                <p className="text-xs text-muted-foreground">Cadastradas no sistema</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeCompanies}</div>
                <p className="text-xs text-muted-foreground">Com assinatura ativa</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos PJ Ativos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-primary">{stats?.totalPJContracts}</div>
                <p className="text-xs text-muted-foreground">Base de faturamento</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.estimatedRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">R$ 49,90 por contrato PJ</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Empresas Recentes</CardTitle>
            <CardDescription>Últimas empresas cadastradas no sistema</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/empresas")}>
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma empresa cadastrada</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/dashboard/empresas/nova")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Empresa
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{company.name}</p>
                        <Badge variant={company.is_active ? "default" : "secondary"}>
                          {company.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCNPJ(company.cnpj)} • {company._count?.users || 0} usuários • <span className="text-primary font-medium">{company._count?.pjContracts || 0} contratos PJ</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground mr-4">
                      {formatDate(company.created_at || "")}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/dashboard/empresas/${company.id}`)}
                      aria-label="Ver detalhes da empresa"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Gerencie o sistema</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/dashboard/empresas")}
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Gerenciar Empresas</span>
            </button>
            <button
              onClick={() => navigate("/dashboard/faturamento")}
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Ver Faturamento</span>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas do Sistema</CardTitle>
            <CardDescription>Notificações importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum alerta no momento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MasterAdminOverview;
