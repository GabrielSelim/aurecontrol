import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, UserPlus, MoreHorizontal, Phone, UserCheck, UserX, Users, Download, ChevronLeft, ChevronRight, ArrowUpDown, X } from "lucide-react";
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
import { formatCPF, formatPhone } from "@/lib/masks";
import { toast } from "sonner";

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
}

const Colaboradores = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [colaboradorToToggle, setColaboradorToToggle] = useState<Colaborador | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchColaboradores = async () => {
      if (!profile?.company_id) return;

      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("full_name");

        if (error) throw error;

        // Fetch roles for each profile
        const colaboradoresWithRoles = await Promise.all(
          (profiles || []).map(async (p) => {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", p.user_id);

            return {
              ...p,
              roles: roles || [],
            };
          })
        );

        setColaboradores(colaboradoresWithRoles);
      } catch (error) {
        console.error("Error fetching colaboradores:", error);
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

  const displayCPF = (cpf: string | null) => {
    if (!cpf) return "-";
    // If already formatted, return as is
    if (cpf.includes(".")) return cpf;
    // Otherwise format it
    return formatCPF(cpf);
  };

  const displayPhone = (phone: string | null) => {
    if (!phone) return "-";
    // If already formatted, return as is
    if (phone.includes("(")) return phone;
    // Otherwise format it
    return formatPhone(phone);
  };

  const confirmToggleStatus = async () => {
    if (!colaboradorToToggle) return;
    
    try {
      const newStatus = !colaboradorToToggle.is_active;
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: newStatus })
        .eq("id", colaboradorToToggle.id);

      if (error) throw error;

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
      console.error("Error toggling status:", error);
      toast.error("Erro ao alterar status do colaborador");
    } finally {
      setColaboradorToToggle(null);
    }
  };

  const exportToCSV = () => {
    const headers = ["Nome", "E-mail", "CPF", "Telefone", "Cargo(s)", "Status"];
    const rows = filteredColaboradores.map(c => [
      c.full_name,
      c.email,
      c.cpf ? formatCPF(c.cpf) : "",
      c.phone ? formatPhone(c.phone) : "",
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

  const filteredColaboradores = colaboradores.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.is_active) ||
      (statusFilter === "inactive" && !c.is_active);
    
    const matchesRole =
      roleFilter === "all" ||
      c.roles.some(r => r.role === roleFilter);
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Sort collaborators
  const sortedColaboradores = [...filteredColaboradores].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.full_name.localeCompare(b.full_name);
    } else if (sortBy === "email") {
      comparison = a.email.localeCompare(b.email);
    } else if (sortBy === "created_at") {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, sortBy, sortOrder, itemsPerPage]);

  // Check if any filter is active
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || roleFilter !== "all" || sortBy !== "name" || sortOrder !== "asc";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setSortBy("name");
    setSortOrder("asc");
  };

  // Pagination
  const totalPages = Math.ceil(sortedColaboradores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedColaboradores = sortedColaboradores.slice(startIndex, startIndex + itemsPerPage);

  const activeCount = colaboradores.filter(c => c.is_active).length;
  const inactiveCount = colaboradores.filter(c => !c.is_active).length;

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{colaboradores.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "active" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setStatusFilter("active")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "inactive" ? "ring-2 ring-muted-foreground" : ""}`}
          onClick={() => setStatusFilter("inactive")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split("-") as ["name" | "email" | "created_at", "asc" | "desc"];
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
                  <SelectItem value="created_at-desc">Mais recentes</SelectItem>
                  <SelectItem value="created_at-asc">Mais antigos</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden lg:table-cell">CPF</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
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
                        <Skeleton className="h-4 w-28" />
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
                    <TableCell colSpan={6} className="h-32 text-center">
                      <p className="text-muted-foreground">
                        Nenhum colaborador encontrado
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedColaboradores.map((colaborador) => (
                    <TableRow key={colaborador.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
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
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {displayPhone(colaborador.phone)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">{displayCPF(colaborador.cpf)}</span>
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
