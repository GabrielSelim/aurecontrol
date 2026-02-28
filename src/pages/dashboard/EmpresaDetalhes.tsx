import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCompanyMaybe, updateCompany } from "@/services/companyService";
import { fetchContractsByCompany } from "@/services/contractService";
import { fetchProfilesByCompany, fetchUserRolesByUserIds } from "@/services/profileService";
import { fetchBillingsByCompany, fetchPaymentsByCompany } from "@/services/paymentService";
import { validateCnpj } from "@/services/edgeFunctionService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Users,
  FileText,
  Receipt,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatCNPJ as formatCNPJMask, validateCNPJ } from "@/lib/masks";
import { logger } from "@/lib/logger";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface CNPJValidationResult {
  valid: boolean;
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao?: string;
  uf?: string;
  municipio?: string;
  error?: string;
  already_registered?: boolean;
  existing_company_name?: string;
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  user_id: string;
  role?: string;
}

interface Contract {
  id: string;
  job_title: string;
  contract_type: "CLT" | "PJ";
  status: string;
  start_date: string;
  end_date: string | null;
  salary: number | null;
  user_id: string;
  user_name?: string;
}

interface Billing {
  id: string;
  reference_month: string;
  pj_contracts_count: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number | null;
  total: number;
  status: string;
  due_date: string;
  paid_at: string | null;
}

interface Payment {
  id: string;
  amount: number;
  reference_month: string;
  status: string;
  payment_date: string | null;
  contract_id: string;
  user_id: string;
  user_name?: string;
  contract_title?: string;
}

const ITEMS_PER_PAGE = 10;

const EmpresaDetalhes = () => {
  useDocumentTitle("Detalhes da Empresa");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    is_active: true,
  });
  const [isValidatingCNPJ, setIsValidatingCNPJ] = useState(false);
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJValidationResult | null>(null);
  const [cnpjError, setCnpjError] = useState("");
  const [originalCnpj, setOriginalCnpj] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeContracts: 0,
    pjContracts: 0,
    pendingBillings: 0,
    totalRevenue: 0,
  });

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [contractsPage, setContractsPage] = useState(1);
  const [billingsPage, setBillingsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);

  useEffect(() => {
    if (id) {
      fetchAllData();
    }
  }, [id]);

  const fetchAllData = async () => {
    setLoadError(false);
    setIsLoading(true);
    try {
      setIsLoading(true);
      
      // Fetch company
      const companyData = await fetchCompanyMaybe(id!);

      if (!companyData) {
        toast.error("Empresa não encontrada");
        navigate("/dashboard/empresas");
        return;
      }
      setCompany(companyData);

      // Fetch all related data in parallel
      const [usersData, contractsData, billingsData, paymentsData] = await Promise.all([
        fetchProfilesByCompany(id!),
        fetchContractsByCompany(id!),
        fetchBillingsByCompany(id!),
        fetchPaymentsByCompany(id!),
      ]) as [Profile[], Contract[], Billing[], Payment[]];

      // Fetch user roles for each user
      const userIds = usersData.map(u => u.user_id);
      if (userIds.length > 0) {
        const rolesData = await fetchUserRolesByUserIds(userIds);
        
        usersData.forEach(user => {
          const userRole = rolesData.find(r => r.user_id === user.user_id);
          user.role = userRole?.role;
        });
      }

      // Create user lookup for contracts and payments
      const userLookup = new Map(usersData.map(u => [u.user_id, u.full_name]));
      
      // Enrich contracts with user names
      contractsData.forEach(contract => {
        contract.user_name = userLookup.get(contract.user_id) || "-";
      });

      // Enrich payments with user names and contract titles
      const contractLookup = new Map(contractsData.map(c => [c.id, c.job_title]));
      paymentsData.forEach(payment => {
        payment.user_name = userLookup.get(payment.user_id) || "-";
        payment.contract_title = contractLookup.get(payment.contract_id) || "-";
      });

      setUsers(usersData);
      setContracts(contractsData);
      setBillings(billingsData);
      setPayments(paymentsData);

      // Calculate stats
      const activeContracts = contractsData.filter(c => c.status === "active").length;
      const pjContracts = contractsData.filter(c => c.contract_type === "PJ" && c.status === "active").length;
      const pendingBillings = billingsData.filter(b => b.status === "pending").length;
      const totalRevenue = billingsData
        .filter(b => b.status === "paid")
        .reduce((acc, b) => acc + Number(b.total), 0);

      setStats({
        totalUsers: usersData.length,
        activeContracts,
        pjContracts,
        pendingBillings,
        totalRevenue,
      });
    } catch (error) {
      logger.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados da empresa");
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const getRoleBadge = (role: string | undefined) => {
    if (!role) return <Badge variant="secondary">-</Badge>;
    const roleLabels: Record<string, string> = {
      admin: "Admin",
      financeiro: "Financeiro",
      gestor: "Gestor",
      colaborador: "Colaborador",
    };
    return (
      <Badge variant="outline">
        {roleLabels[role] || role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/10 text-green-600 border-green-500/20",
      inactive: "bg-muted text-muted-foreground",
      terminated: "bg-red-500/10 text-red-600 border-red-500/20",
      pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      paid: "bg-green-500/10 text-green-600 border-green-500/20",
      approved: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      rejected: "bg-red-500/10 text-red-600 border-red-500/20",
      cancelled: "bg-muted text-muted-foreground",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      inactive: "Inativo",
      terminated: "Encerrado",
      pending: "Pendente",
      paid: "Pago",
      approved: "Aprovado",
      rejected: "Rejeitado",
      cancelled: "Cancelado",
    };
    return (
      <Badge variant="outline" className={styles[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Pagination helpers
  const getPaginatedData = <T,>(data: T[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTotalPages = (total: number) => Math.ceil(total / ITEMS_PER_PAGE);

  const renderPagination = (
    currentPage: number,
    totalItems: number,
    setPage: (page: number) => void
  ) => {
    const totalPages = getTotalPages(totalItems);
    if (totalItems <= ITEMS_PER_PAGE) return null;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    
    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} de {totalItems}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (totalPages <= 5) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => (
                <span key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(page)}
                  >
                    {page}
                  </Button>
                </span>
              ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const openEditDialog = () => {
    if (company) {
      setEditForm({
        name: company.name,
        cnpj: formatCNPJMask(company.cnpj),
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        is_active: company.is_active,
      });
      setOriginalCnpj(company.cnpj);
      setCnpjValidated(true); // Current CNPJ is considered valid
      setCnpjError("");
      setCnpjData(null);
      setIsEditOpen(true);
    }
  };

  const validateCNPJFromAPI = async (cnpjValue: string) => {
    const cleanCNPJ = cnpjValue.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;

    // If CNPJ hasn't changed, no need to validate
    if (cleanCNPJ === originalCnpj) {
      setCnpjValidated(true);
      setCnpjError("");
      setCnpjData(null);
      return;
    }

    setIsValidatingCNPJ(true);
    setCnpjValidated(false);
    setCnpjData(null);

    try {
      const result = await validateCnpj(cleanCNPJ);

      setCnpjData(result);
      
      if (result.valid) {
        setCnpjValidated(true);
        setCnpjError("");
        toast.success("CNPJ válido!");
      } else {
        setCnpjError(result.error || "CNPJ inválido");
      }
    } catch (error) {
      logger.error("Error validating CNPJ:", error);
      setCnpjError("Erro ao validar CNPJ. Tente novamente.");
    } finally {
      setIsValidatingCNPJ(false);
    }
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJMask(value);
    setEditForm({ ...editForm, cnpj: formatted });
    setCnpjValidated(false);
    setCnpjData(null);
    
    const cleanCNPJ = formatted.replace(/\D/g, "");
    
    // If CNPJ hasn't changed from original, mark as valid
    if (cleanCNPJ === originalCnpj) {
      setCnpjValidated(true);
      setCnpjError("");
      return;
    }
    
    if (formatted.length === 18) {
      if (!validateCNPJ(formatted)) {
        setCnpjError("CNPJ inválido (dígitos verificadores incorretos)");
      } else {
        setCnpjError("");
        validateCNPJFromAPI(formatted);
      }
    } else {
      setCnpjError("");
    }
  };

  const handleUpdateCompany = async () => {
    if (!company || !editForm.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    if (editForm.name.trim().length > 200) {
      toast.error("Nome da empresa deve ter no máximo 200 caracteres");
      return;
    }

    const cleanCNPJ = editForm.cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) {
      toast.error("CNPJ inválido");
      return;
    }

    // If CNPJ changed, it must be validated
    if (cleanCNPJ !== originalCnpj && !cnpjValidated) {
      toast.error("Aguarde a validação do CNPJ");
      return;
    }

    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      toast.error("E-mail inválido");
      return;
    }

    setIsSaving(true);
    try {
      await updateCompany(company.id, {
          name: editForm.name.trim(),
          cnpj: cleanCNPJ,
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          address: editForm.address.trim() || null,
          is_active: editForm.is_active,
        });

      setCompany({
        ...company,
        name: editForm.name.trim(),
        cnpj: cleanCNPJ,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
        is_active: editForm.is_active,
      });

      toast.success("Empresa atualizada com sucesso");
      setIsEditOpen(false);
    } catch (error) {
      logger.error("Error updating company:", error);
      toast.error("Erro ao atualizar empresa");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Erro ao carregar dados da empresa" onRetry={fetchAllData} />;
  }

  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/empresas")} aria-label="Voltar para empresas">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
                <p className="text-muted-foreground font-mono text-sm">{formatCNPJ(company.cnpj)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={company.is_active ? "default" : "secondary"} className="text-sm">
            {company.is_active ? "Ativa" : "Inativa"}
          </Badge>
          <Button variant="outline" onClick={openEditDialog}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-medium">{company.email || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{formatPhone(company.phone)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-medium">{company.address || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cadastrada em</p>
                <p className="font-medium">{formatDate(company.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeContracts}</p>
                <p className="text-sm text-muted-foreground">Contratos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pjContracts}</p>
                <p className="text-sm text-muted-foreground">Contratos PJ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Receipt className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingBillings}</p>
                <p className="text-sm text-muted-foreground">Faturas Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuários ({users.length})
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <FileText className="h-4 w-4 mr-2" />
            Contratos ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="billings">
            <Receipt className="h-4 w-4 mr-2" />
            Faturamento ({billings.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Pagamentos ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuários da Empresa</CardTitle>
              <CardDescription>Lista de todos os usuários vinculados a esta empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuário encontrado</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Cadastrado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaginatedData(users, usersPage).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{formatPhone(user.phone)}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {formatDate(user.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {renderPagination(usersPage, users.length, setUsersPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Contratos</CardTitle>
              <CardDescription>Histórico de contratos da empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum contrato encontrado</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Término</TableHead>
                        <TableHead className="text-right">Salário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaginatedData(contracts, contractsPage).map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            {contract.user_name || "-"}
                          </TableCell>
                          <TableCell>{contract.job_title}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={contract.contract_type === "PJ" ? "default" : "secondary"}>
                              {contract.contract_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(contract.status)}
                          </TableCell>
                          <TableCell>{formatDate(contract.start_date)}</TableCell>
                          <TableCell>{contract.end_date ? formatDate(contract.end_date) : "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {contract.salary ? formatCurrency(contract.salary) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {renderPagination(contractsPage, contracts.length, setContractsPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billings Tab */}
        <TabsContent value="billings">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Faturamento</CardTitle>
              <CardDescription>Faturas geradas para esta empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {billings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma fatura encontrada</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referência</TableHead>
                        <TableHead className="text-center">Contratos PJ</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Pago em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaginatedData(billings, billingsPage).map((billing) => (
                        <TableRow key={billing.id}>
                          <TableCell className="font-medium capitalize">
                            {formatMonth(billing.reference_month)}
                          </TableCell>
                          <TableCell className="text-center">{billing.pj_contracts_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(billing.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(billing.subtotal)}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {billing.discount_amount ? `-${formatCurrency(billing.discount_amount)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(billing.total)}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(billing.status)}</TableCell>
                          <TableCell>{formatDate(billing.due_date)}</TableCell>
                          <TableCell>{billing.paid_at ? formatDate(billing.paid_at) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {renderPagination(billingsPage, billings.length, setBillingsPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos de Colaboradores</CardTitle>
              <CardDescription>Histórico de pagamentos realizados a colaboradores</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pagamento encontrado</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Contrato</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Data Pagamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaginatedData(payments, paymentsPage).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.user_name || "-"}
                          </TableCell>
                          <TableCell>{payment.contract_title || "-"}</TableCell>
                          <TableCell className="capitalize">{formatMonth(payment.reference_month)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {payment.payment_date ? formatDate(payment.payment_date) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {renderPagination(paymentsPage, payments.length, setPaymentsPage)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Company Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Atualize as informações da empresa
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nome da empresa"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <div className="relative">
                <Input
                  id="cnpj"
                  value={editForm.cnpj}
                  onChange={(e) => handleCNPJChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={`pr-12 ${
                    cnpjError 
                      ? "border-destructive" 
                      : cnpjValidated 
                        ? "border-green-500" 
                        : ""
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidatingCNPJ && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  {!isValidatingCNPJ && cnpjValidated && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {!isValidatingCNPJ && cnpjError && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
              {cnpjError && <p className="text-sm text-destructive">{cnpjError}</p>}
              
              {/* Show validated company info */}
              {cnpjValidated && cnpjData && cnpjData.razao_social && (
                <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Verificado na Receita Federal
                      </p>
                      <p className="text-green-700 dark:text-green-300">
                        {cnpjData.razao_social}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@empresa.com"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Endereço completo"
                maxLength={500}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Status da Empresa</Label>
                <p className="text-sm text-muted-foreground">
                  {editForm.is_active ? "Empresa ativa" : "Empresa inativa"}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateCompany} 
              disabled={isSaving || isValidatingCNPJ || !cnpjValidated || !!cnpjError}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmpresaDetalhes;
