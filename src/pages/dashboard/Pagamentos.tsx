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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  MoreHorizontal,
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Payment {
  id: string;
  user_id: string;
  company_id: string;
  contract_id: string;
  amount: number;
  description: string | null;
  reference_month: string;
  payment_date: string | null;
  status: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface Contract {
  id: string;
  user_id: string;
  job_title: string;
  salary: number | null;
  profile?: {
    full_name: string;
  };
}

const Pagamentos = () => {
  const { profile, isAdmin, hasRole } = useAuth();
  const [pagamentos, setPagamentos] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedContractId, setSelectedContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [description, setDescription] = useState("");

  const canManagePayments = isAdmin() || hasRole("financeiro");

  useEffect(() => {
    fetchPagamentos();
    fetchContracts();
  }, [profile?.company_id]);

  const fetchPagamentos = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile info for each payment
      const pagamentosWithProfiles = await Promise.all(
        (data || []).map(async (payment) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", payment.user_id)
            .single();

          return {
            ...payment,
            profile: profileData || undefined,
          };
        })
      );

      setPagamentos(pagamentosWithProfiles);
    } catch (error) {
      console.error("Error fetching pagamentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContracts = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, user_id, job_title, salary")
        .eq("company_id", profile.company_id)
        .eq("status", "active");

      if (error) throw error;

      // Fetch profile names
      const contractsWithProfiles = await Promise.all(
        (data || []).map(async (contract) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", contract.user_id)
            .single();

          return {
            ...contract,
            profile: profileData || undefined,
          };
        })
      );

      setContracts(contractsWithProfiles);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const handleCreatePayment = async () => {
    if (!profile?.company_id || !selectedContractId || !amount || !referenceMonth) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const selectedContract = contracts.find((c) => c.id === selectedContractId);
    if (!selectedContract) {
      toast.error("Contrato não encontrado");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("payments").insert({
        company_id: profile.company_id,
        user_id: selectedContract.user_id,
        contract_id: selectedContractId,
        amount: parseFloat(amount),
        reference_month: `${referenceMonth}-01`,
        description: description || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Pagamento criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      fetchPagamentos();
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Erro ao criar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          payment_date: new Date().toISOString().split("T")[0],
          approved_by: profile?.user_id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Pagamento aprovado!");
      fetchPagamentos();
    } catch (error) {
      console.error("Error approving payment:", error);
      toast.error("Erro ao aprovar pagamento");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: "rejected" })
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Pagamento rejeitado");
      fetchPagamentos();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error("Erro ao rejeitar pagamento");
    }
  };

  const resetForm = () => {
    setSelectedContractId("");
    setAmount("");
    setReferenceMonth("");
    setDescription("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      rejected: "destructive",
      cancelled: "outline",
    };
    return variants[status] || "outline";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      rejected: "Rejeitado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatReferenceMonth = (date: string) => {
    return format(new Date(date), "MMMM/yyyy", { locale: ptBR });
  };

  const filteredPagamentos = pagamentos.filter(
    (p) =>
      p.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalPendente = pagamentos
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPago = pagamentos
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os pagamentos dos colaboradores
          </p>
        </div>
        {canManagePayments && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pagamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Pagamento</DialogTitle>
                <DialogDescription>
                  Preencha as informações do pagamento
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Contrato *</Label>
                  <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.profile?.full_name} - {c.job_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mês de Referência *</Label>
                    <Input
                      type="month"
                      value={referenceMonth}
                      onChange={(e) => setReferenceMonth(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Ex: Salário mensal"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePayment} disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Criar Pagamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendente)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPago)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagamentos.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pagamentos</CardTitle>
          <CardDescription>
            {pagamentos.length} pagamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Referência</TableHead>
                  <TableHead className="hidden lg:table-cell">Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPagamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPagamentos.map((pagamento) => (
                    <TableRow key={pagamento.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pagamento.profile?.full_name || "-"}</p>
                          <p className="text-sm text-muted-foreground">
                            {pagamento.profile?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(Number(pagamento.amount))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm capitalize">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatReferenceMonth(pagamento.reference_month)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {pagamento.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(pagamento.status)}
                          <Badge variant={getStatusBadgeVariant(pagamento.status)}>
                            {getStatusLabel(pagamento.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            {canManagePayments && pagamento.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleApprovePayment(pagamento.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRejectPayment(pagamento.id)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Rejeitar
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

export default Pagamentos;
