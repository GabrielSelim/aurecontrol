import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPJContracts, fetchPJPayments } from "@/services/pjService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CreditCard, Clock, CheckCircle, ArrowRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { logger } from "@/lib/logger";

const PJDashboard = () => {
  useDocumentTitle("Meu Painel — Aure");
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [c, p] = await Promise.all([
        fetchPJContracts(user!.id),
        fetchPJPayments(user!.id),
      ]);
      setContracts(c);
      setPayments(p);
    } catch (err) {
      logger.error("PJ Dashboard load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeContracts = contracts.filter((c) => c.status === "active" || c.status === "assinado");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const totalReceivedThisYear = payments
    .filter((p) => p.status === "paid" && new Date(p.paid_at).getFullYear() === new Date().getFullYear())
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {profile?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">Aqui está o resumo da sua conta</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Contratos Ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeContracts.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pagamentos Pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingPayments.length}</p>
            {pendingPayments.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(pendingPayments.reduce((s, p) => s + (p.amount || 0), 0))} a receber
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Recebido em {new Date().getFullYear()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalReceivedThisYear)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent contracts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contratos Recentes</CardTitle>
            <CardDescription>Seus últimos contratos</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/pj/contratos")}>
            Ver todos <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum contrato encontrado</p>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{c.job_title}</p>
                    <p className="text-xs text-muted-foreground">
                      Início: {format(new Date(c.start_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant={c.status === "active" || c.status === "assinado" ? "default" : "secondary"}>
                    {c.status === "active" ? "Vigente" :
                     c.status === "assinado" ? "Assinado" :
                     c.status === "terminated" ? "Encerrado" : c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pagamentos Recentes</CardTitle>
              <CardDescription>Últimas movimentações</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/pj/pagamentos")}>
              Ver todos <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{p.description || "Pagamento"}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(p.amount || 0)}</p>
                    <Badge variant={p.status === "paid" ? "default" : p.status === "pending" ? "outline" : "secondary"} className="text-xs">
                      {p.status === "paid" ? <><CheckCircle className="h-3 w-3 mr-1" />Pago</> : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PJDashboard;
