import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Label } from "@/components/ui/label";
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

interface Billing {
  id: string;
  company_id: string;
  reference_month: string;
  pj_contracts_count: number;
  unit_price: number;
  discount_amount: number;
  discount_description: string | null;
  subtotal: number;
  total: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  created_at: string;
  company?: {
    name: string;
    cnpj: string;
  };
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
}

interface BillingStats {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
}

const Faturamento = () => {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);

  // Generate billing form state
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [referenceMonth, setReferenceMonth] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch billings with company info
      const { data: billingsData, error: billingsError } = await supabase
        .from("company_billings")
        .select("*")
        .order("created_at", { ascending: false });

      if (billingsError) throw billingsError;

      // Fetch company names for each billing
      if (billingsData && billingsData.length > 0) {
        const companyIds = [...new Set(billingsData.map((b) => b.company_id))];
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name, cnpj")
          .in("id", companyIds);

        const billingsWithCompany = billingsData.map((billing) => ({
          ...billing,
          company: companiesData?.find((c) => c.id === billing.company_id),
        }));

        setBillings(billingsWithCompany as Billing[]);
      } else {
        setBillings([]);
      }

      // Fetch all companies for generate dialog
      const { data: allCompanies } = await supabase
        .from("companies")
        .select("id, name, cnpj")
        .eq("is_active", true)
        .order("name");

      if (allCompanies) setCompanies(allCompanies);

      // Calculate stats
      const pending = billingsData?.filter((b) => b.status === "pending") || [];
      const paid = billingsData?.filter((b) => b.status === "paid") || [];
      const overdue = billingsData?.filter((b) => b.status === "overdue") || [];

      setStats({
        totalPending: pending.reduce((sum, b) => sum + Number(b.total), 0),
        totalPaid: paid.reduce((sum, b) => sum + Number(b.total), 0),
        totalOverdue: overdue.reduce((sum, b) => sum + Number(b.total), 0),
        pendingCount: pending.length,
        paidCount: paid.length,
        overdueCount: overdue.length,
      });
    } catch (error) {
      console.error("Error fetching billings:", error);
      toast.error("Erro ao carregar faturamento");
    } finally {
      setIsLoading(false);
    }
  };

  const generateBilling = async () => {
    if (!selectedCompany || !referenceMonth) {
      toast.error("Selecione a empresa e o mês de referência");
      return;
    }

    setIsGenerating(true);
    try {
      // Get PJ contracts count for the company
      const { count: pjCount } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("company_id", selectedCompany)
        .eq("contract_type", "PJ")
        .eq("status", "active");

      // Get base price from settings
      const { data: settings } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "pj_contract_price")
        .maybeSingle();

      const basePrice = (settings?.value as { amount: number })?.amount || 49.90;

      // Get pricing tier based on contract count
      const { data: tiers } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("is_active", true)
        .order("min_contracts");

      let unitPrice = basePrice;
      if (tiers && pjCount) {
        const applicableTier = tiers.find(
          (t) => pjCount >= t.min_contracts && (t.max_contracts === null || pjCount <= t.max_contracts)
        );
        if (applicableTier) {
          unitPrice = applicableTier.price_per_contract;
        }
      }

      const contractsCount = pjCount || 0;
      const subtotal = contractsCount * unitPrice;
      const total = subtotal; // Could apply discounts here

      // Calculate due date (10th of next month)
      const refDate = new Date(referenceMonth + "-01");
      const dueDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 10);

      const { error } = await supabase.from("company_billings").insert([{
        company_id: selectedCompany,
        reference_month: referenceMonth + "-01",
        pj_contracts_count: contractsCount,
        unit_price: unitPrice,
        subtotal,
        total,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
      }]);

      if (error) throw error;

      toast.success("Fatura gerada com sucesso!");
      setGenerateDialogOpen(false);
      setSelectedCompany("");
      setReferenceMonth("");
      fetchData();
    } catch (error) {
      console.error("Error generating billing:", error);
      toast.error("Erro ao gerar fatura");
    } finally {
      setIsGenerating(false);
    }
  };

  const markAsPaid = async (paymentMethod: string) => {
    if (!selectedBilling) return;

    try {
      const { error } = await supabase
        .from("company_billings")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
        })
        .eq("id", selectedBilling.id);

      if (error) throw error;

      toast.success("Pagamento registrado!");
      setMarkPaidDialogOpen(false);
      setSelectedBilling(null);
      fetchData();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Erro ao registrar pagamento");
    }
  };

  const cancelBilling = async (billing: Billing) => {
    try {
      const { error } = await supabase
        .from("company_billings")
        .update({ status: "cancelled" })
        .eq("id", billing.id);

      if (error) throw error;
      toast.success("Fatura cancelada!");
      fetchData();
    } catch (error) {
      console.error("Error cancelling billing:", error);
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

  const filteredBillings = billings.filter((billing) => {
    const matchesSearch =
      billing.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      billing.company?.cnpj.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || billing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                          <Button variant="ghost" size="icon">
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
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Nova Fatura</DialogTitle>
            <DialogDescription>
              Selecione a empresa e o mês de referência para gerar a fatura
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={generateBilling} disabled={isGenerating}>
              {isGenerating ? "Gerando..." : "Gerar Fatura"}
            </Button>
          </DialogFooter>
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
