import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPJPayments } from "@/services/pjService";
import { fetchNfseByContract } from "@/services/nfseService";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Search, CheckCircle, Clock, FileCheck, FileClock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

const PJPagamentos = () => {
  useDocumentTitle("Meus Pagamentos — Aure");
  const { user } = useAuth();
  const { toast } = useToast();

  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // NFS-e status per contract_id: "emitida" | "pendente" | "none"
  const [nfseMap, setNfseMap] = useState<Record<string, "emitida" | "pendente" | "none">>({});

  useEffect(() => {
    if (user) loadPayments();
  }, [user]);

  const loadPayments = async () => {
    try {
      const data = await fetchPJPayments(user!.id);
      setPayments(data);
      // Batch load NFS-e for all unique contract_ids
      const contractIds = [...new Set(data.map((p: any) => p.contract_id).filter(Boolean))] as string[];
      if (contractIds.length > 0) {
        const results = await Promise.allSettled(contractIds.map(fetchNfseByContract));
        const map: Record<string, "emitida" | "pendente" | "none"> = {};
        contractIds.forEach((cid, i) => {
          const r = results[i];
          if (r.status === "fulfilled" && r.value.length > 0) {
            const hasEmitida = r.value.some((n) => n.status === "emitida");
            map[cid] = hasEmitida ? "emitida" : "pendente";
          } else {
            map[cid] = "none";
          }
        });
        setNfseMap(map);
      }
    } catch (err) {
      logger.error("PJPagamentos load error:", err);
      toast({ title: "Erro ao carregar pagamentos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = payments.filter((p) => {
    const matchSearch = p.description?.toLowerCase().includes(search.toLowerCase()) ?? true;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = filtered
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const totalPending = filtered
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Pagamentos</h1>
        <p className="text-muted-foreground">Histórico completo de pagamentos</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" /> Total Recebido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-yellow-500" /> A Receber
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Em Atraso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {search || statusFilter !== "all" ? "Nenhum pagamento encontrado" : "Nenhum pagamento registrado"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-sm">{p.description || "Pagamento"}</p>
                <p className="text-xs text-muted-foreground">
                  Vencimento:{" "}
                  {p.due_date
                    ? format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR })
                    : "—"}
                </p>
                {p.paid_at && (
                  <p className="text-xs text-muted-foreground">
                    Pago em: {format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
                {/* NFS-e status badge */}
                {p.contract_id && nfseMap[p.contract_id] === "emitida" && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <FileCheck className="h-3.5 w-3.5" /> NFS-e emitida
                  </span>
                )}
                {p.contract_id && nfseMap[p.contract_id] === "pendente" && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <FileClock className="h-3.5 w-3.5" /> NFS-e pendente
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <p className="font-semibold">{formatCurrency(p.amount || 0)}</p>
                <Badge
                  variant={
                    p.status === "paid" ? "default" :
                    p.status === "overdue" ? "destructive" :
                    "outline"
                  }
                >
                  {p.status === "paid" ? "Pago" :
                   p.status === "overdue" ? "Em Atraso" :
                   "Pendente"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

export default PJPagamentos;
