import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProfilesByCompany, fetchUserRoles, updateProfileById } from "@/services/profileService";
import { fetchContractsByUser } from "@/services/contractService";
import { fetchPaymentsByUser } from "@/services/paymentService";
import { sendEmail } from "@/services/edgeFunctionService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, UserPlus, MoreHorizontal, UserCheck, UserX, Users, Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, Info, LayoutGrid, List, Mail, Building2, FileText, Briefcase, AlertTriangle, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { formatCPF, formatPhone, formatBRL } from "@/lib/masks";
import { toast } from "sonner";
import { ColaboradoresChart } from "@/components/dashboard/ColaboradoresChart";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";

interface Colaborador {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  roles: { role: string }[];
  department: string | null;
  has_contract: boolean;
  contract_type: string | null;
  job_title: string | null;
  totalPaid: number;
  contractEndDate: string | null;
}

const Colaboradores = () => {
  useDocumentTitle("Colaboradores");
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [contractTypeFilter, setContractTypeFilter] = useState<"all" | "pj" | "clt" | "none">("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "created_at" | "job_title" | "contract_type" | "total_paid" | "role" | "status">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [colaboradorToToggle, setColaboradorToToggle] = useState<Colaborador | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchColaboradores = async () => {
      if (!profile?.company_id) return;

      try {
        const profiles = await fetchProfilesByCompany(profile.company_id);

        // Fetch roles and contracts for each profile
        const colaboradoresWithRolesAndDept = await Promise.all(
          profiles.map(async (p) => {
            const [roles, contracts, payments] = await Promise.all([
              fetchUserRoles(p.user_id),
              fetchContractsByUser(p.user_id),
              fetchPaymentsByUser(p.user_id),
            ]);

            const activeContract = contracts.find((c) => c.status === "active");
            const totalPaid = payments
              .filter((pay) => pay.status === "paid")
              .reduce((sum, pay) => sum + Number(pay.amount), 0);

            return {
              ...p,
              roles,
              department: activeContract?.department || null,
              has_contract: !!activeContract,
              contract_type: activeContract?.contract_type || null,
              job_title: activeContract?.job_title || null,
              totalPaid,
              contractEndDate: activeContract?.end_date || null,
            };
          })
        );

        setColaboradores(colaboradoresWithRolesAndDept);
      } catch (error) {
        logger.error("Error fetching colaboradores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColaboradores();
  }, [profile?.company_id]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-lime-100 text-lime-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      master_admin: "Master Admin",
      admin: "Administrador",
      financeiro: "Financeiro",
      gestor: "Gestor",
      colaborador: "Colaborador",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      master_admin: "default",
      admin: "default",
      financeiro: "secondary",
      gestor: "secondary",
      colaborador: "outline",
    };
    return variants[role] || "outline";
  };



  const confirmToggleStatus = async () => {
    if (!colaboradorToToggle) return;
    
    try {
      const newStatus = !colaboradorToToggle.is_active;
      await updateProfileById(colaboradorToToggle.id, { is_active: newStatus });

      setColaboradores(prev =>
        prev.map(c =>
          c.id === colaboradorToToggle.id ? { ...c, is_active: newStatus } : c
        )
      );

      toast.success(
        newStatus
          ? `${colaboradorToToggle.full_name} foi ativado`
          : `${colaboradorToToggle.full_name} foi desativado`
      );
    } catch (error) {
      logger.error("Error toggling status:", error);
      toast.error("Erro ao alterar status do colaborador");
    } finally {
      setColaboradorToToggle(null);
    }
  };

  const exportToCSV = () => {
    const headers = ["Nome", "E-mail", "Profissão", "Tipo Contrato", "Custo Total", "Cargo(s)", "Status"];
    const rows = filteredColaboradores.map(c => [
      c.full_name,
      c.email,
      c.job_title || "",
      c.has_contract ? (c.contract_type === "pj" ? "PJ" : "CLT") : "Sem contrato",
      c.totalPaid > 0 ? c.totalPaid.toFixed(2) : "0.00",
      c.roles.map(r => getRoleLabel(r.role)).join("; "),
      c.is_active ? "Ativo" : "Inativo"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `colaboradores_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Lista exportada com sucesso!");
  };

  const exportSelectedToCSV = () => {
    const selected = colaboradores.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) return;
    const headers = ["Nome", "E-mail", "Profissão", "Tipo Contrato", "Custo Total", "Cargo(s)", "Status"];
    const rows = selected.map(c => [
      c.full_name,
      c.email,
      c.job_title || "",
      c.has_contract ? (c.contract_type === "pj" ? "PJ" : "CLT") : "Sem contrato",
      c.totalPaid > 0 ? c.totalPaid.toFixed(2) : "0.00",
      c.roles.map(r => getRoleLabel(r.role)).join("; "),
      c.is_active ? "Ativo" : "Inativo"
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `colaboradores_selecionados_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${selected.length} colaborador(es) exportado(s)`);
    setSelectedIds(new Set());
  };

  const sendBulkReminder = async () => {
    const selected = colaboradores.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) return;

    toast.loading(`Enviando lembretes para ${selected.length} colaborador(es)...`, { id: "bulk-reminder" });

    let sent = 0;
    let failed = 0;

    for (const collab of selected) {
      try {
        const missingItems: string[] = [];
        if (!collab.cpf) missingItems.push("CPF");
        if (!collab.phone) missingItems.push("Telefone");
        if (!collab.has_contract) missingItems.push("Contrato vinculado");

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px}.button{display:inline-block;background:#667eea;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0}.footer{text-align:center;margin-top:20px;color:#666;font-size:12px}</style>
</head><body><div class="container">
<div class="header"><h1>📝 Lembrete de Cadastro</h1></div>
<div class="content">
<p>Olá <strong>${collab.full_name}</strong>,</p>
<p>Identificamos que alguns dados do seu perfil estão pendentes de preenchimento:</p>
<ul>${missingItems.map(item => `<li>${item}</li>`).join("")}</ul>
<p>Por favor, acesse o sistema e complete seu cadastro para que possamos dar continuidade aos processos:</p>
<p style="text-align:center"><a href="${window.location.origin}/dashboard" class="button">Acessar Aure</a></p>
<div class="footer"><p>Aure System - Gestão de Colaboradores</p></div>
</div></div></body></html>`;

        await sendEmail({
          to: collab.email,
          subject: "📝 Lembrete: Complete seu cadastro - Aure System",
          html,
          from_name: "Aure System",
        });
        sent++;
      } catch {
        failed++;
      }
    }

    toast.dismiss("bulk-reminder");
    if (failed === 0) {
      toast.success(`Lembrete enviado para ${sent} colaborador(es)!`);
    } else {
      toast.warning(`${sent} enviado(s), ${failed} falha(s)`);
    }
    setSelectedIds(new Set());
  };

  const filteredColaboradores = useMemo(() => colaboradores.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.is_active) ||
      (statusFilter === "inactive" && !c.is_active);
    
    const matchesRole =
      roleFilter === "all" ||
      c.roles.some(r => r.role === roleFilter);
    
    const matchesDepartment =
      departmentFilter === "all" ||
      c.department === departmentFilter;

    const matchesContractType =
      contractTypeFilter === "all" ||
      (contractTypeFilter === "pj" && c.contract_type === "pj") ||
      (contractTypeFilter === "clt" && c.contract_type === "clt") ||
      (contractTypeFilter === "none" && !c.has_contract);
    
    return matchesSearch && matchesStatus && matchesRole && matchesDepartment && matchesContractType;
  }), [colaboradores, debouncedSearchTerm, statusFilter, roleFilter, departmentFilter, contractTypeFilter]);

  // Sort collaborators
  const sortedColaboradores = useMemo(() => [...filteredColaboradores].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.full_name.localeCompare(b.full_name);
    } else if (sortBy === "email") {
      comparison = a.email.localeCompare(b.email);
    } else if (sortBy === "created_at") {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === "job_title") {
      comparison = (a.job_title || "").localeCompare(b.job_title || "");
    } else if (sortBy === "contract_type") {
      comparison = (a.contract_type || "").localeCompare(b.contract_type || "");
    } else if (sortBy === "total_paid") {
      comparison = a.totalPaid - b.totalPaid;
    } else if (sortBy === "role") {
      const roleA = a.roles?.[0]?.role || "";
      const roleB = b.roles?.[0]?.role || "";
      comparison = roleA.localeCompare(roleB);
    } else if (sortBy === "status") {
      comparison = Number(a.is_active) - Number(b.is_active);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  }), [filteredColaboradores, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedColaboradores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedColaboradores = sortedColaboradores.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedColaboradores.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedColaboradores.map(c => c.id)));
    }
  }, [selectedIds.size, paginatedColaboradores]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Get unique departments for filter
  const departments = useMemo(() => [...new Set(colaboradores.map(c => c.department).filter(Boolean))] as string[], [colaboradores]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, departmentFilter, contractTypeFilter, sortBy, sortOrder, itemsPerPage]);

  // Toggle sort when clicking column header
  const handleColumnSort = useCallback((column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  }, [sortBy]);

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    return sortOrder === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || roleFilter !== "all" || departmentFilter !== "all" || contractTypeFilter !== "all" || sortBy !== "name" || sortOrder !== "asc";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setDepartmentFilter("all");
    setContractTypeFilter("all");
    setSortBy("name");
    setSortOrder("asc");
  };

  const activeCount = colaboradores.filter(c => c.is_active).length;
  const inactiveCount = colaboradores.filter(c => !c.is_active).length;
  const pjCount = colaboradores.filter(c => c.contract_type === "pj").length;
  const cltCount = colaboradores.filter(c => c.contract_type === "clt").length;
  const isContractExpiringSoon = (endDate: string | null): boolean => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  };

  const daysUntilExpiry = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os colaboradores da sua empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          {isAdmin() && (
            <Button onClick={() => navigate("/dashboard/convites")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Total</p>
                        <Info className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                      <p className="text-2xl font-bold">{colaboradores.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de colaboradores cadastrados na empresa</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "active" ? "ring-2 ring-green-500" : ""}`}
                onClick={() => setStatusFilter("active")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                        <Info className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                      <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Colaboradores com acesso ativo ao sistema</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "inactive" ? "ring-2 ring-muted-foreground" : ""}`}
                onClick={() => setStatusFilter("inactive")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                        <Info className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                      <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <UserX className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Colaboradores desativados sem acesso ao sistema</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${contractTypeFilter === "pj" ? "ring-2 ring-blue-500" : ""}`}
                onClick={() => setContractTypeFilter(contractTypeFilter === "pj" ? "all" : "pj")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-muted-foreground">PJ</p>
                        <Info className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{pjCount}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Colaboradores com contrato PJ ativo</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${contractTypeFilter === "clt" ? "ring-2 ring-purple-500" : ""}`}
                onClick={() => setContractTypeFilter(contractTypeFilter === "clt" ? "all" : "clt")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-muted-foreground">CLT</p>
                        <Info className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{cltCount}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Colaboradores com contrato CLT ativo</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Evolution Chart */}
      <ColaboradoresChart colaboradores={colaboradores} isLoading={isLoading} />

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Colaboradores</CardTitle>
          <CardDescription>
            {colaboradores.length} colaborador(es) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos cargos</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
              <Select value={contractTypeFilter} onValueChange={(value: "all" | "pj" | "clt" | "none") => setContractTypeFilter(value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <FileText className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos contratos</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="none">Sem contrato</SelectItem>
                </SelectContent>
              </Select>
              {departments.length > 0 && (
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <Building2 className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split("-") as [typeof sortBy, "asc" | "desc"];
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                  <SelectItem value="email-asc">E-mail (A-Z)</SelectItem>
                  <SelectItem value="email-desc">E-mail (Z-A)</SelectItem>
                  <SelectItem value="total_paid-desc">Maior custo</SelectItem>
                  <SelectItem value="total_paid-asc">Menor custo</SelectItem>
                  <SelectItem value="created_at-desc">Mais recentes</SelectItem>
                  <SelectItem value="created_at-asc">Mais antigos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30 animate-in fade-in">
              <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
              <Button size="sm" variant="outline" onClick={exportSelectedToCSV} className="gap-1">
                <Download className="h-3.5 w-3.5" />
                Exportar selecionados
              </Button>
              <Button size="sm" variant="outline" onClick={sendBulkReminder} className="gap-1">
                <Send className="h-3.5 w-3.5" />
                Enviar lembrete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="ml-auto gap-1">
                <X className="h-3.5 w-3.5" />
                Limpar seleção
              </Button>
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={paginatedColaboradores.length > 0 && selectedIds.size === paginatedColaboradores.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleColumnSort("name")}>
                      <span className="flex items-center">Colaborador<SortIcon column="name" /></span>
                    </TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleColumnSort("job_title")}>
                      <span className="flex items-center">Profissão<SortIcon column="job_title" /></span>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleColumnSort("contract_type")}>
                      <span className="flex items-center">Tipo Contrato<SortIcon column="contract_type" /></span>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleColumnSort("total_paid")}>
                      <span className="flex items-center">Custo Total<SortIcon column="total_paid" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleColumnSort("role")}>
                      <span className="flex items-center">Cargo<SortIcon column="role" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleColumnSort("status")}>
                      <span className="flex items-center">Status<SortIcon column="status" /></span>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-40" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Skeleton className="h-6 w-16" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : sortedColaboradores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <p className="text-muted-foreground">
                          Nenhum colaborador encontrado
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedColaboradores.map((colaborador) => (
                      <TableRow key={colaborador.id} className={selectedIds.has(colaborador.id) ? "bg-primary/5" : ""}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(colaborador.id)}
                            onCheckedChange={() => toggleSelect(colaborador.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className={getAvatarColor(colaborador.full_name)}>
                                {getInitials(colaborador.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{colaborador.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {colaborador.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {colaborador.job_title ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Briefcase className="h-3 w-3 text-muted-foreground" />
                              {colaborador.job_title}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Não informado</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {colaborador.has_contract ? (
                            <div className="flex items-center gap-2">
                              <Badge variant={colaborador.contract_type === "pj" ? "default" : "secondary"}>
                                <FileText className="h-3 w-3 mr-1" />
                                {colaborador.contract_type === "pj" ? "PJ" : "CLT"}
                              </Badge>
                              {isContractExpiringSoon(colaborador.contractEndDate) && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-amber-600 border-amber-400 dark:text-amber-400 dark:border-amber-600 gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Vence em {daysUntilExpiry(colaborador.contractEndDate)}d
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Contrato expira em {daysUntilExpiry(colaborador.contractEndDate)} dia(s)</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                              Sem contrato
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className={colaborador.totalPaid > 0 ? "font-medium" : "text-muted-foreground"}>
                            {colaborador.totalPaid > 0 ? formatBRL(colaborador.totalPaid) : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {colaborador.roles.map((r, i) => (
                              <Badge key={i} variant={getRoleBadgeVariant(r.role)}>
                                {getRoleLabel(r.role)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={colaborador.is_active ? "default" : "secondary"}>
                            {colaborador.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/dashboard/colaboradores/${colaborador.id}`)}>
                                Ver detalhes
                              </DropdownMenuItem>
                              {isAdmin() && (
                                <>
                                  <DropdownMenuItem onClick={() => navigate(`/dashboard/colaboradores/${colaborador.id}/editar`)}>
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setColaboradorToToggle(colaborador)}
                                    className={colaborador.is_active ? "text-destructive" : "text-primary"}
                                  >
                                    {colaborador.is_active ? (
                                      <>
                                        <UserX className="mr-2 h-4 w-4" />
                                        Desativar
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Ativar
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <Skeleton className="h-16 w-16 rounded-full" />
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-40" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : sortedColaboradores.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  Nenhum colaborador encontrado
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedColaboradores.map((colaborador) => (
                    <Card 
                      key={colaborador.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => navigate(`/dashboard/colaboradores/${colaborador.id}`)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className={`${getAvatarColor(colaborador.full_name)} text-xl`}>
                              {getInitials(colaborador.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{colaborador.full_name}</p>
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                              <Mail className="h-3 w-3" />
                              {colaborador.email}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                              <Briefcase className="h-3 w-3" />
                              {colaborador.job_title || <span className="italic">Não informado</span>}
                            </p>
                            {colaborador.department && (
                              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                                <Building2 className="h-3 w-3" />
                                {colaborador.department}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap justify-center gap-1">
                            {colaborador.has_contract ? (
                              <Badge variant={colaborador.contract_type === "pj" ? "default" : "secondary"}>
                                <FileText className="h-3 w-3 mr-1" />
                                {colaborador.contract_type === "pj" ? "PJ" : "CLT"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Sem contrato
                              </Badge>
                            )}
                            {isContractExpiringSoon(colaborador.contractEndDate) && (
                              <Badge variant="outline" className="text-amber-600 border-amber-400 dark:text-amber-400 dark:border-amber-600 gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Vence em {daysUntilExpiry(colaborador.contractEndDate)}d
                              </Badge>
                            )}
                          </div>
                          {colaborador.totalPaid > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Custo total: <span className="font-medium text-foreground">{formatBRL(colaborador.totalPaid)}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap justify-center gap-1">
                            {colaborador.roles.map((r, i) => (
                              <Badge key={i} variant={getRoleBadgeVariant(r.role)}>
                                {getRoleLabel(r.role)}
                              </Badge>
                            ))}
                          </div>
                          <Badge variant={colaborador.is_active ? "default" : "secondary"}>
                            {colaborador.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin() && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/colaboradores/${colaborador.id}/editar`);
                                }}
                              >
                                Editar
                              </Button>
                              <Button 
                                variant={colaborador.is_active ? "destructive" : "default"} 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setColaboradorToToggle(colaborador);
                                }}
                              >
                                {colaborador.is_active ? "Desativar" : "Ativar"}
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {sortedColaboradores.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedColaboradores.length)} de {sortedColaboradores.length}
                </p>
                <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / pág</SelectItem>
                    <SelectItem value="10">10 / pág</SelectItem>
                    <SelectItem value="25">25 / pág</SelectItem>
                    <SelectItem value="50">50 / pág</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 5) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, idx, arr) => (
                        <span key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-1 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </span>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!colaboradorToToggle} onOpenChange={(open) => !open && setColaboradorToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {colaboradorToToggle?.is_active ? "Desativar colaborador?" : "Ativar colaborador?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {colaboradorToToggle?.is_active
                ? `Tem certeza que deseja desativar ${colaboradorToToggle?.full_name}? O colaborador não poderá mais acessar o sistema.`
                : `Tem certeza que deseja ativar ${colaboradorToToggle?.full_name}? O colaborador poderá acessar o sistema novamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              className={colaboradorToToggle?.is_active ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {colaboradorToToggle?.is_active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Colaboradores;
