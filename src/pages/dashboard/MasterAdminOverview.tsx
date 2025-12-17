import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, CreditCard, Plus, Eye, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface GlobalStats {
  totalCompanies: number;
  totalUsers: number;
  totalContracts: number;
  totalPayments: number;
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
        const [companiesResult, usersResult, contractsResult, paymentsResult] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("contracts").select("*", { count: "exact", head: true }),
          supabase.from("payments").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          totalCompanies: companiesResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalContracts: contractsResult.count || 0,
          totalPayments: paymentsResult.count || 0,
        });

        // Fetch companies list with user count
        const { data: companiesData } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (companiesData) {
          // Get user counts for each company
          const companiesWithCounts = await Promise.all(
            companiesData.map(async (company) => {
              const { count } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("company_id", company.id);
              return {
                ...company,
                _count: { users: count || 0 },
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
            Painel de administração global do sistema
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
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
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
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Total de usuários</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalContracts}</div>
                <p className="text-xs text-muted-foreground">Em todo o sistema</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalPayments}</div>
                <p className="text-xs text-muted-foreground">Registrados</p>
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
                        {formatCNPJ(company.cnpj)} • {company._count?.users || 0} usuários
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground mr-4">
                      Criada em {formatDate(company.created_at || "")}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/dashboard/empresas/${company.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/dashboard/empresas/${company.id}/editar`)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Gerencie o sistema de forma eficiente</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/dashboard/empresas")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Building2 className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Gerenciar Empresas</span>
          </button>
          <button
            onClick={() => navigate("/dashboard/usuarios")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Users className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Todos os Usuários</span>
          </button>
          <button
            onClick={() => navigate("/dashboard/contratos")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <FileText className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Todos os Contratos</span>
          </button>
          <button
            onClick={() => navigate("/dashboard/pagamentos")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <CreditCard className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Todos os Pagamentos</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterAdminOverview;
