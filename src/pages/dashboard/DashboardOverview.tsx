import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CreditCard, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalColaboradores: number;
  contratosAtivos: number;
  pagamentosPendentes: number;
  pagamentosMes: number;
}

const DashboardOverview = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.company_id) return;

      try {
        // Fetch colaboradores count
        const { count: colaboradoresCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("company_id", profile.company_id)
          .eq("is_active", true);

        // Fetch contratos ativos count
        const { count: contratosCount } = await supabase
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .eq("company_id", profile.company_id)
          .eq("status", "active");

        // Fetch pagamentos pendentes count
        const { count: pagamentosPendentesCount } = await supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("company_id", profile.company_id)
          .eq("status", "pending");

        // Fetch pagamentos do mês
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

        setStats({
          totalColaboradores: colaboradoresCount || 0,
          contratosAtivos: contratosCount || 0,
          pagamentosPendentes: pagamentosPendentesCount || 0,
          pagamentosMes: totalPagamentosMes,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [profile?.company_id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bem-vindo, {profile?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está um resumo da sua empresa
        </p>
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
                <div className="text-2xl font-bold">{stats?.totalColaboradores}</div>
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
                <div className="text-2xl font-bold">{stats?.contratosAtivos}</div>
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
                <div className="text-2xl font-bold">{stats?.pagamentosPendentes}</div>
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
                  {formatCurrency(stats?.pagamentosMes || 0)}
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
            <a
              href="/dashboard/colaboradores"
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Users className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Ver Colaboradores</span>
            </a>
            <a
              href="/dashboard/contratos"
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <FileText className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Gerenciar Contratos</span>
            </a>
            <a
              href="/dashboard/pagamentos"
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Ver Pagamentos</span>
            </a>
            <a
              href="/dashboard/convites"
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <CheckCircle className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Convidar Usuário</span>
            </a>
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
};

export default DashboardOverview;
