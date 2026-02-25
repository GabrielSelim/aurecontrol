import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Pencil, Mail, Phone, FileText, CreditCard, Loader2, UserCog } from "lucide-react";
import { formatCPF, formatPhone } from "@/lib/masks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ColaboradorData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  roles: { role: string }[];
}

interface Contract {
  id: string;
  job_title: string;
  contract_type: "CLT" | "PJ" | "estagio" | "temporario";
  status: "active" | "inactive" | "terminated" | "enviado" | "assinado";
  start_date: string;
  end_date: string | null;
  salary: number | null;
  hourly_rate: number | null;
  department: string | null;
}

interface Payment {
  id: string;
  amount: number;
  reference_month: string;
  status: "pending" | "approved" | "paid" | "rejected";
  payment_date: string | null;
  description: string | null;
}

const ColaboradorDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, hasRole } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [colaborador, setColaborador] = useState<ColaboradorData | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Verificar se o usuário pode alterar papéis (Admin ou Gestor)
  const canChangeRoles = hasRole("master_admin") || hasRole("admin") || hasRole("gestor");

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !profile?.company_id) return;

      try {
        // Fetch collaborator profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .eq("company_id", profile.company_id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          navigate("/dashboard/colaboradores");
          return;
        }

        // Fetch roles
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profileData.user_id);

        setColaborador({
          ...profileData,
          roles: rolesData || [],
        });

        // Fetch contracts
        const { data: contractsData, error: contractsError } = await supabase
          .from("contracts")
          .select("*")
          .eq("user_id", profileData.user_id)
          .eq("company_id", profile.company_id)
          .order("start_date", { ascending: false });

        if (contractsError) throw contractsError;
        setContracts(contractsData || []);

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("user_id", profileData.user_id)
          .eq("company_id", profile.company_id)
          .order("reference_month", { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, profile?.company_id, navigate]);

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
      juridico: "Jurídico",
      gestor: "Gestor",
      colaborador: "Colaborador",
    };
    return labels[role] || role;
  };

  const handleOpenRoleDialog = () => {
    if (colaborador && colaborador.roles.length > 0) {
      setSelectedRole(colaborador.roles[0].role);
    }
    setIsRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!colaborador || !selectedRole) return;

    setIsUpdatingRole(true);
    try {
      // Remover papéis antigos (exceto master_admin que não pode ser alterado)
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", colaborador.user_id)
        .neq("role", "master_admin");

      if (deleteError) throw deleteError;

      // Inserir novo papel
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: colaborador.user_id,
          role: selectedRole as "admin" | "financeiro" | "juridico" | "gestor" | "colaborador",
        });

      if (insertError) throw insertError;

      // Atualizar estado local
      setColaborador({
        ...colaborador,
        roles: [{ role: selectedRole }],
      });

      toast.success("Papel do colaborador atualizado com sucesso");
      setIsRoleDialogOpen(false);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar papel do colaborador");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Papéis disponíveis para seleção (Gestor só pode atribuir colaborador e financeiro)
  const getAvailableRoles = () => {
    const baseRoles = [
      { value: "colaborador", label: "Colaborador" },
      { value: "financeiro", label: "Financeiro" },
      { value: "juridico", label: "Jurídico" },
      { value: "gestor", label: "Gestor" },
    ];

    // Apenas Admin e Master Admin podem promover a Admin
    if (hasRole("master_admin") || hasRole("admin")) {
      baseRoles.push({ value: "admin", label: "Administrador" });
    }

    return baseRoles;
  };

  const getContractStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      terminated: { label: "Encerrado", variant: "destructive" },
    };
    const { label, variant } = config[status] || { label: status, variant: "secondary" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "outline" },
      approved: { label: "Aprovado", variant: "secondary" },
      paid: { label: "Pago", variant: "default" },
      rejected: { label: "Rejeitado", variant: "destructive" },
    };
    const { label, variant } = config[status] || { label: status, variant: "secondary" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!colaborador) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Colaborador não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/colaboradores")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detalhes do Colaborador</h1>
            <p className="text-muted-foreground mt-1">
              Visualize informações, contratos e pagamentos
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/dashboard/colaboradores/${id}/editar`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials(colaborador.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{colaborador.full_name}</h2>
                  <Badge variant={colaborador.is_active ? "default" : "secondary"}>
                    {colaborador.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {colaborador.roles.map((r, i) => (
                    <Badge key={i} variant="outline">
                      {getRoleLabel(r.role)}
                    </Badge>
                  ))}
                  {canChangeRoles && !colaborador.roles.some(r => r.role === "master_admin") && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs"
                      onClick={handleOpenRoleDialog}
                    >
                      <UserCog className="h-3 w-3 mr-1" />
                      Alterar papel
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {colaborador.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {colaborador.phone ? formatPhone(colaborador.phone) : "-"}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium">CPF:</span> {colaborador.cpf ? formatCPF(colaborador.cpf) : "-"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="h-4 w-4" />
            Contratos ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamentos ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Contratos</CardTitle>
              <CardDescription>Histórico de contratos do colaborador</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum contrato encontrado
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.job_title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{contract.contract_type}</Badge>
                          </TableCell>
                          <TableCell>{contract.department || "-"}</TableCell>
                          <TableCell>
                            {format(new Date(contract.start_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {contract.end_date
                              ? format(new Date(contract.end_date), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {contract.salary
                              ? formatCurrency(contract.salary)
                              : contract.hourly_rate
                              ? `${formatCurrency(contract.hourly_rate)}/h`
                              : "-"}
                          </TableCell>
                          <TableCell>{getContractStatusBadge(contract.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos</CardTitle>
              <CardDescription>Histórico de pagamentos do colaborador</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pagamento encontrado
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referência</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data Pagamento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {format(new Date(payment.reference_month), "MMMM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{payment.description || "-"}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            {payment.payment_date
                              ? format(new Date(payment.payment_date), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Dialog para alterar papel */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Alterar Papel do Colaborador</DialogTitle>
            <DialogDescription>
              Selecione o novo papel para {colaborador.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Papel Atual</Label>
              <div className="flex flex-wrap gap-1">
                {colaborador.roles.map((r, i) => (
                  <Badge key={i} variant="outline">
                    {getRoleLabel(r.role)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Novo Papel</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdatingRole || !selectedRole}>
              {isUpdatingRole ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColaboradorDetalhes;
