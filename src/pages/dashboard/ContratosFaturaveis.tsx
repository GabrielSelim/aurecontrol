import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSignature,
  Search,
  Eye,
  DollarSign,
  Building2,
  Calendar,
  Users,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BillableContract {
  id: string;
  job_title: string;
  start_date: string;
  user_id: string;
  company_id: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
  company: {
    name: string;
  } | null;
  document: {
    completed_at: string | null;
  } | null;
}

interface Company {
  id: string;
  name: string;
}

const ContratosFaturaveis = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<BillableContract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [pricePerContract, setPricePerContract] = useState<number>(0);

  useEffect(() => {
    fetchBillableContracts();
    fetchPricing();
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    
    if (data) {
      setCompanies(data);
    }
  };

  const fetchPricing = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "pj_contract_price")
      .maybeSingle();

    if (data?.value) {
      setPricePerContract(Number(data.value));
    }
  };

  const fetchBillableContracts = async () => {
    try {
      // Get all PJ contracts with completed signatures
      const { data: contractDocs, error: docsError } = await supabase
        .from("contract_documents")
        .select("contract_id, completed_at")
        .eq("signature_status", "completed");

      if (docsError) throw docsError;

      if (!contractDocs || contractDocs.length === 0) {
        setContracts([]);
        setIsLoading(false);
        return;
      }

      const contractIds = contractDocs.map(d => d.contract_id);

      // Fetch the contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select(`
          id,
          job_title,
          start_date,
          user_id,
          company_id
        `)
        .in("id", contractIds)
        .eq("contract_type", "PJ")
        .eq("status", "active");

      if (contractsError) throw contractsError;

      // Fetch profiles and companies for these contracts
      const userIds = [...new Set(contractsData?.map(c => c.user_id) || [])];
      const companyIds = [...new Set(contractsData?.map(c => c.company_id) || [])];

      const [profilesRes, companiesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
        supabase.from("companies").select("id, name").in("id", companyIds),
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.user_id, p]));
      const companiesMap = new Map(companiesRes.data?.map(c => [c.id, c]));
      const docsMap = new Map(contractDocs.map(d => [d.contract_id, d]));

      const enrichedContracts: BillableContract[] = (contractsData || []).map(contract => ({
        ...contract,
        profile: profilesMap.get(contract.user_id) || null,
        company: companiesMap.get(contract.company_id) || null,
        document: docsMap.get(contract.id) || null,
      }));

      setContracts(enrichedContracts);
    } catch (error) {
      console.error("Error fetching billable contracts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      contract.profile?.full_name?.toLowerCase().includes(searchLower) ||
      contract.company?.name?.toLowerCase().includes(searchLower) ||
      contract.job_title?.toLowerCase().includes(searchLower)
    );
    const matchesCompany = selectedCompany === "all" || contract.company_id === selectedCompany;
    return matchesSearch && matchesCompany;
  });

  const totalEstimatedRevenue = filteredContracts.length * pricePerContract;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  // Group contracts by company for summary
  const contractsByCompany = filteredContracts.reduce((acc, contract) => {
    const companyName = contract.company?.name || "Sem empresa";
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(contract);
    return acc;
  }, {} as Record<string, BillableContract[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contratos PJ Faturáveis</h1>
        <p className="text-muted-foreground">
          Contratos PJ com assinaturas completas que serão faturados no próximo ciclo
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Contratos
            </CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredContracts.length}</div>
            <p className="text-xs text-muted-foreground">contratos assinados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empresas
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(contractsByCompany).length}</div>
            <p className="text-xs text-muted-foreground">empresas com contratos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Estimada
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalEstimatedRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pricePerContract)} por contrato
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Contratos
          </CardTitle>
          <CardDescription>
            Todos os contratos PJ que estão totalmente assinados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, empresa ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum contrato faturável</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Não há contratos PJ com assinaturas completas no momento
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Assinado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contract.profile?.full_name || "-"}</p>
                          <p className="text-sm text-muted-foreground">
                            {contract.profile?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{contract.company?.name || "-"}</TableCell>
                      <TableCell>{contract.job_title}</TableCell>
                      <TableCell>{formatDate(contract.start_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {formatDate(contract.document?.completed_at || null)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/contratos/${contract.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary by Company */}
      {Object.keys(contractsByCompany).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Resumo por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(contractsByCompany).map(([companyName, companyContracts]) => (
                <div
                  key={companyName}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div>
                    <p className="font-medium">{companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {companyContracts.length} contrato(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {formatCurrency(companyContracts.length * pricePerContract)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContratosFaturaveis;
