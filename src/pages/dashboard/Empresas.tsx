import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Eye, Settings, Users, MoreHorizontal, FileText, Briefcase, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  _count?: {
    users: number;
    pjContracts: number;
    otherContracts: number;
  };
}

interface PricingTier {
  min_contracts: number;
  max_contracts: number | null;
  price_per_contract: number;
}

const Empresas = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPricingTiers = async () => {
      const { data } = await supabase
        .from("pricing_tiers")
        .select("min_contracts, max_contracts, price_per_contract")
        .eq("is_active", true)
        .order("min_contracts", { ascending: true });
      
      if (data) setPricingTiers(data);
    };
    fetchPricingTiers();
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data: companiesData, error } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (companiesData) {
          // Get counts for each company
          const companiesWithCounts = await Promise.all(
            companiesData.map(async (company) => {
              const [usersResult, pjContractsResult, otherContractsResult] = await Promise.all([
                supabase
                  .from("profiles")
                  .select("*", { count: "exact", head: true })
                  .eq("company_id", company.id),
                supabase
                  .from("contracts")
                  .select("*", { count: "exact", head: true })
                  .eq("company_id", company.id)
                  .eq("contract_type", "PJ"),
                supabase
                  .from("contracts")
                  .select("*", { count: "exact", head: true })
                  .eq("company_id", company.id)
                  .neq("contract_type", "PJ"),
              ]);

              return {
                ...company,
                _count: {
                  users: usersResult.count || 0,
                  pjContracts: pjContractsResult.count || 0,
                  otherContracts: otherContractsResult.count || 0,
                },
              };
            })
          );
          setCompanies(companiesWithCounts);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, "");
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "-";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const calculateEstimatedRevenue = (pjContractCount: number): number => {
    if (pjContractCount === 0 || pricingTiers.length === 0) return 0;
    
    const tier = pricingTiers.find(t => 
      pjContractCount >= t.min_contracts && 
      (t.max_contracts === null || pjContractCount <= t.max_contracts)
    );
    
    if (tier) {
      return pjContractCount * tier.price_per_contract;
    }
    
    // Fallback to last tier if no match
    const lastTier = pricingTiers[pricingTiers.length - 1];
    return pjContractCount * lastTier.price_per_contract;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj.includes(searchTerm) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as empresas cadastradas no sistema
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/empresas/nova")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Empresas</CardTitle>
              <CardDescription>
                {companies.length} empresa(s) cadastrada(s)
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma empresa encontrada</p>
              {searchTerm && (
                <p className="text-sm mt-2">Tente buscar com outros termos</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="text-center">PJ</TableHead>
                  <TableHead className="text-center">Outros</TableHead>
                  <TableHead className="text-center">Receita Est.</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">{company.name}</span>
                          <p className="text-xs text-muted-foreground">{company.email || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCNPJ(company.cnpj)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{company._count?.users || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 cursor-help">
                            <FileText className="h-3 w-3 mr-1" />
                            {company._count?.pjContracts || 0}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Contratos PJ (Faturáveis)</p>
                          <p className="text-xs text-muted-foreground">
                            Prestadores de serviço pessoa jurídica.<br/>
                            Geram cobrança mensal por contrato ativo.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="cursor-help">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {company._count?.otherContracts || 0}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Outros Contratos (Gratuitos)</p>
                          <p className="text-xs text-muted-foreground">
                            CLT, estágio, temporários e outros.<br/>
                            Apenas para gestão interna, sem cobrança.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="font-medium text-green-600 dark:text-green-400 cursor-help">
                            {formatCurrency(calculateEstimatedRevenue(company._count?.pjContracts || 0))}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Receita Mensal Estimada</p>
                          <p className="text-xs text-muted-foreground">
                            Baseado em {company._count?.pjContracts || 0} contrato(s) PJ ativo(s).<br/>
                            Valor pode variar com cupons e promoções.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={company.is_active ? "default" : "secondary"}>
                        {company.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/dashboard/empresas/${company.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/dashboard/empresas/${company.id}/usuarios`)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Ver Usuários
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/dashboard/empresas/${company.id}/editar`)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Empresas;
