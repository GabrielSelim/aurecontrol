import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { billingGenerateSchema, type BillingGenerateFormData } from "@/schemas/forms";
import {
  useBillingsWithCompanies,
  useActiveCompaniesForBilling,
  useCreateBilling,
  useMarkBillingAsPaid,
  useCancelBilling,
  type BillingWithCompany,
} from "@/hooks/queries/useBillingQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  Plus,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  Download,
  Eye,
  DollarSign,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";

type Billing = BillingWithCompany;

interface Company {
  id: string;
  name: string;
  cnpj: string;
}

const Faturamento = () => {
  useDocumentTitle("Faturamento");

  // --- TanStack Query hooks ------------------------------------------------
  const billingsQuery = useBillingsWithCompanies();
  const companiesQuery = useActiveCompaniesForBilling();
  const createBillingMutation = useCreateBilling();
  const markPaidMutation = useMarkBillingAsPaid();
  const cancelBillingMutation = useCancelBilling();

  // Derived server state
  const billings = (billingsQuery.data?.billings ?? []) as Billing[];
  const companies = (companiesQuery.data ?? []) as Company[];
  const stats = billingsQuery.data?.stats ?? null;
  const isLoading = billingsQuery.isLoading;
  const loadError = billingsQuery.isError;

  // --- Local UI state -------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);

  // Generate billing form
  const billingForm = useForm<BillingGenerateFormData>({
    resolver: zodResolver(billingGenerateSchema),
    defaultValues: { selectedCompany: "", referenceMonth: "" },
  });

  const generateBilling = async (data: BillingGenerateFormData) => {
    try {
      await createBillingMutation.mutateAsync({
        selectedCompany: data.selectedCompany,
        referenceMonth: data.referenceMonth,
      });
      toast.success("Fatura gerada com sucesso!");
      setGenerateDialogOpen(false);
      billingForm.reset();
    } catch {
      toast.error("Erro ao gerar fatura");
    }
  };

  const markAsPaid = async (paymentMethod: string) => {
    if (!selectedBilling) return;
    try {
      await markPaidMutation.mutateAsync({
        billingId: selectedBilling.id,
        paymentMethod,
      });
      toast.success("Pagamento registrado!");
      setMarkPaidDialogOpen(false);
      setSelectedBilling(null);
    } catch {
      toast.error("Erro ao registrar pagamento");
    }
  };

  const cancelBilling = async (billing: Billing) => {
    try {
      await cancelBillingMutation.mutateAsync(billing.id);
      toast.success("Fatura cancelada!");
    } catch {
      toast.error("Erro ao cancelar fatura");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { label: "Pendente", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      paid: { label: "Pago", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      overdue: { label: "Atrasado", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
      cancelled: { label: "Cancelado", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
    };
    const { label, variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {label}
      </Badge>
    );
  };

  const filteredBillings = useMemo(() => billings.filter((billing) => {
    const matchesSearch =
      billing.company?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      billing.company?.cnpj.includes(debouncedSearchTerm);
    const matchesStatus = statusFilter === "all" || billing.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [billings, debouncedSearchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Erro ao carregar faturamento" onRetry={() => billingsQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Faturamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as cobranças das empresas
          </p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Gerar Fatura
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalPending || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingCount || 0} fatura(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.paidCount || 0} fatura(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats?.totalOverdue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdueCount || 0} fatura(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Billings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Faturas</CardTitle>
              <CardDescription>
                {billings.length} fatura(s) no total
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBillings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-center">Contratos PJ</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBillings.map((billing) => (
                  <TableRow key={billing.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{billing.company?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {billing.company?.cnpj}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {formatMonth(billing.reference_month)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{billing.pj_contracts_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(billing.total)}
                    </TableCell>
                    <TableCell>{formatDate(billing.due_date)}</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(billing.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Mais opções">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {billing.status === "pending" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedBilling(billing);
                                setMarkPaidDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Registrar Pagamento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </DropdownMenuItem>
                          {billing.status === "pending" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => cancelBilling(billing)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
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

      {/* Generate Billing Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={(open) => { setGenerateDialogOpen(open); if (!open) billingForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Nova Fatura</DialogTitle>
            <DialogDescription>
              Selecione a empresa e o mês de referência para gerar a fatura
            </DialogDescription>
          </DialogHeader>
          <Form {...billingForm}>
            <form onSubmit={billingForm.handleSubmit(generateBilling)} className="space-y-4 py-4">
              <FormField
                control={billingForm.control}
                name="selectedCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={billingForm.control}
                name="referenceMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês de Referência</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createBillingMutation.isPending}>
                  {createBillingMutation.isPending ? "Gerando..." : "Gerar Fatura"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Confirme o recebimento de {selectedBilling && formatCurrency(selectedBilling.total)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => markAsPaid("pix")}
              >
                <DollarSign className="h-6 w-6" />
                PIX
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => markAsPaid("boleto")}
              >
                <FileText className="h-6 w-6" />
                Boleto
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => markAsPaid("transferencia")}
              >
                <CreditCard className="h-6 w-6" />
                Transferência
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => markAsPaid("outros")}
              >
                <MoreHorizontal className="h-6 w-6" />
                Outros
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Faturamento;
