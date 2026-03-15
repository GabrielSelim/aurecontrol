import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPaymentsByUser } from "@/services/paymentService";
import { fetchProfile } from "@/services/profileService";
import { fetchContractsByUser } from "@/services/contractService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Download, TrendingUp, CreditCard, Calendar, DollarSign } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface Payment {
  id: string;
  amount: number;
  reference_month: string;
  status: string;
  payment_date: string | null;
  description: string | null;
  contract_id: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid:     { label: "Pago",      variant: "default" },
  pending:  { label: "Pendente",  variant: "outline" },
  approved: { label: "Aprovado",  variant: "secondary" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};

const PERIOD_OPTIONS = [
  { value: "3",   label: "Últimos 3 meses" },
  { value: "6",   label: "Últimos 6 meses" },
  { value: "12",  label: "Últimos 12 meses" },
  { value: "all", label: "Todo o histórico" },
];

const ColaboradorExtrato = () => {
  useDocumentTitle("Extrato Financeiro");
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: authProfile, hasRole } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("12");

  const canView = hasRole("master_admin") || hasRole("admin") || hasRole("financeiro");

  useEffect(() => {
    if (!userId || !authProfile?.company_id) return;
    loadData();
  }, [userId, authProfile]);

  const loadData = async () => {
    try {
      const [payments, prof] = await Promise.all([
        fetchPaymentsByUser(userId!, authProfile!.company_id!),
        fetchProfile(userId!).catch(() => null),
      ]);
      setPayments(payments as Payment[]);
      if (prof) setProfile({ full_name: prof.full_name, email: prof.email });
    } catch (err) {
      logger.error("ColaboradorExtrato:", err);
      toast.error("Erro ao carregar extrato");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (period === "all") return payments;
    const cutoff = subMonths(new Date(), parseInt(period));
    return payments.filter(p => new Date(p.reference_month) >= cutoff);
  }, [payments, period]);

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(p => {
      const month = p.reference_month.slice(0, 7);
      if (!map[month]) map[month] = 0;
      if (p.status === "paid") map[month] += p.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: format(new Date(month + "-01"), "MMM/yy", { locale: ptBR }),
        total,
      }));
  }, [filtered]);

  const stats = useMemo(() => ({
    totalPaid: filtered.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    totalPending: filtered.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    countPaid: filtered.filter(p => p.status === "paid").length,
    countPending: filtered.filter(p => p.status === "pending").length,
  }), [filtered]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleExportCSV = () => {
    const headers = ["Competência", "Descrição", "Valor", "Status", "Data de Pagamento"];
    const rows = filtered.map(p => [
      p.reference_month.slice(0, 7),
      p.description || "",
      p.amount.toFixed(2),
      STATUS_MAP[p.status]?.label || p.status,
      p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy") : "",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_${profile?.full_name?.replace(/\s+/g, "_") ?? userId}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Extrato Financeiro</h1>
            {profile && (
              <p className="text-sm text-muted-foreground">{profile.full_name} — {profile.email}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
                    <p className="text-xs text-muted-foreground">Total pago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.totalPending)}</p>
                    <p className="text-xs text-muted-foreground">A receber</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xl font-bold">{stats.countPaid}</p>
                    <p className="text-xs text-muted-foreground">Pagamentos realizados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-bold">{stats.countPending}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pagamentos por mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), "Pago"]}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum pagamento no período selecionado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered
                      .sort((a, b) => b.reference_month.localeCompare(a.reference_month))
                      .map(p => {
                        const cfg = STATUS_MAP[p.status] ?? { label: p.status, variant: "outline" as const };
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {format(new Date(p.reference_month), "MMM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.description || "—"}
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.payment_date
                                ? format(new Date(p.payment_date), "dd/MM/yyyy", { locale: ptBR })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ColaboradorExtrato;
