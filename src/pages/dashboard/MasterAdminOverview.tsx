import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, CreditCard, Plus, Eye, Settings, TrendingUp, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface GlobalStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  totalContracts: number;
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  _count?: {
    users: number;
    contracts: number;
  };
}

const MasterAdminOverview = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch global stats
        const [companiesResult, activeCompaniesResult, usersResult, contractsResult] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("companies").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("contracts").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          totalCompanies: companiesResult.count || 0,
          activeCompanies: activeCompaniesResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalContracts: contractsResult.count || 0,
        });

        // Fetch companies list with counts
        const { data: companiesData } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (companiesData) {
          const companiesWithCounts = await Promise.all(
            companiesData.map(async (company) => {
              const [usersResult, contractsResult] = await Promise.all([
                supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", company.id),
                supabase.from("contracts").select("*", { count: "exact", head: true }).eq("company_id", company.id),
              ]);
              return {
                ...company,
                _count: { users: usersResult.count || 0, contracts: contractsResult.count || 0 },
              };
            })
          );
          setCompanies(companiesWithCounts);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, "");
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
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
        <Button onClick={() => navigate("/dashboard/empresas/nova")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Em todas as empresas</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalContracts}</div>
                <p className="text-xs text-muted-foreground">Gerenciados no sistema</p>
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
                        {formatCNPJ(company.cnpj)} • {company._count?.users || 0} usuários • {company._count?.contracts || 0} contratos
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
              onClick={() => navigate("/dashboard/assinaturas")}
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Ver Assinaturas</span>
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
