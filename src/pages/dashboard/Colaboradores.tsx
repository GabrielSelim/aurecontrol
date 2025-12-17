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
import { Search, UserPlus, MoreHorizontal, Phone, UserCheck, UserX } from "lucide-react";
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
  roles: { role: string }[];
}

const Colaboradores = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const toggleColaboradorStatus = async (colaborador: Colaborador) => {
    try {
      const newStatus = !colaborador.is_active;
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: newStatus })
        .eq("id", colaborador.id);

      if (error) throw error;

      setColaboradores(prev =>
        prev.map(c =>
          c.id === colaborador.id ? { ...c, is_active: newStatus } : c
        )
      );

      toast.success(
        newStatus
          ? `${colaborador.full_name} foi ativado`
          : `${colaborador.full_name} foi desativado`
      );
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Erro ao alterar status do colaborador");
    }
  };

  const filteredColaboradores = colaboradores.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {isAdmin() && (
          <Button onClick={() => navigate("/dashboard/convites")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Convidar
          </Button>
        )}
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
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
                ) : filteredColaboradores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <p className="text-muted-foreground">
                        Nenhum colaborador encontrado
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColaboradores.map((colaborador) => (
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
                                  onClick={() => toggleColaboradorStatus(colaborador)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Colaboradores;
