import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useActiveSubscription,
  useSubscriptionHistory,
  useSubscriptionCheckout,
  useSignatureQuota,
  type Subscription,
} from "@/hooks/queries/useSubscriptionQueries";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  QrCode,
  Copy,
  ExternalLink,
  Calendar,
  Zap,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Tag,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { type SubscriptionCheckoutResult } from "@/services/asaasService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 

interface PricingTier {
  id: string;
  name: string;
  min_contracts: number;
  max_contracts: number | null;
  subscription_monthly_price: number | null;
}

const ANNUAL_DISCOUNT = 0.15;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function StatusBadge({ status }: { status: Subscription["status"] }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active:     { label: "Ativo",     variant: "default" },
    pending:    { label: "Aguardando pagamento", variant: "secondary" },
    cancelled:  { label: "Cancelado", variant: "outline" },
    expired:    { label: "Expirado",  variant: "destructive" },
    upgrading:  { label: "Upgrade",   variant: "secondary" },
  };
  const { label, variant } = config[status] ?? config.pending;
  return <Badge variant={variant}>{label}</Badge>;
}

function CycleLabel({ cycle }: { cycle: "monthly" | "annual" }) {
  return cycle === "annual"
    ? <Badge variant="outline" className="text-green-600 border-green-500">Anual</Badge>
    : <Badge variant="outline">Mensal</Badge>;
}

export default function MeuPlano() {
  useDocumentTitle("Meu Plano");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const subQuery = useActiveSubscription();
  const historyQuery = useSubscriptionHistory(companyId);
  const checkoutMutation = useSubscriptionCheckout();
  const quota = useSignatureQuota();

  const subscription = subQuery.data;
  const history = historyQuery.data ?? [];

  // Upgrade dialog
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [upgradeCycle, setUpgradeCycle] = useState<"monthly" | "annual">("monthly");
  const [paymentResult, setPaymentResult] = useState<SubscriptionCheckoutResult | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Coupon state
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discount_type: string;
    discount_value: number;
    description: string | null;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const resetCoupon = () => {
    setCouponOpen(false);
    setCouponInput("");
    setCouponApplied(null);
    setCouponError(null);
    setCouponLoading(false);
  };

  const validateCoupon = useCallback(async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponApplied(null);
    try {
      const { data, error } = await supabase
        .from("discount_coupons")
        .select("code, discount_type, discount_value, description")
        .eq("code", code)
        .single();
      if (error || !data) {
        setCouponError("Cupom inválido, expirado ou não encontrado.");
      } else {
        setCouponApplied(data as { code: string; discount_type: string; discount_value: number; description: string | null });
        setCouponError(null);
      }
    } catch {
      setCouponError("Erro ao validar cupom. Tente novamente.");
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput]);

  // Fetch pricing tiers for upgrade
  const tiersQuery = useQuery({
    queryKey: ["pricing-tiers", "subscription"],
    queryFn: async (): Promise<PricingTier[]> => {
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("id, name, min_contracts, max_contracts, subscription_monthly_price")
        .eq("is_active", true)
        .order("min_contracts");
      if (error) throw error;
      return (data ?? []) as PricingTier[];
    },
    enabled: upgradeOpen,
  });

  const handleUpgrade = async () => {
    if (!selectedTier || !companyId) return;
    try {
      const result = await checkoutMutation.mutateAsync({
        company_id: companyId,
        tier_id: selectedTier.id,
        cycle: upgradeCycle,
        is_upgrade: subscription?.status === "active",
        coupon_code: couponApplied?.code,
      });
      setUpgradeOpen(false);
      resetCoupon();
      if (result.activated_immediately) {
        const msg = result.coupon_discount
          ? `Plano ativado! Desconto de ${formatCurrency(result.coupon_discount)} aplicado pelo cupom.`
          : "Plano atualizado com sucesso!";
        toast.success(msg);
        subQuery.refetch();
      } else {
        setPaymentResult(result);
        setPaymentDialogOpen(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar assinatura");
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (subQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Meu Plano
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie sua assinatura do AureControl</p>
        </div>
        <Button onClick={() => setUpgradeOpen(true)}>
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          {subscription?.status === "active" ? "Trocar plano" : "Assinar agora"}
        </Button>
      </div>

      {/* Active subscription */}
      {subscription ? (
        <Card className={subscription.status === "active" ? "border-primary/30" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{subscription.plan_name}</CardTitle>
                <CardDescription>Sua assinatura atual</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <CycleLabel cycle={subscription.cycle} />
                <StatusBadge status={subscription.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Valor mensal</p>
                <p className="text-xl font-bold">{formatCurrency(subscription.monthly_value)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total cobrado</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(subscription.total_charged)}</p>
                {subscription.discount_percent > 0 && (
                  <p className="text-xs text-green-600">{subscription.discount_percent}% desconto aplicado</p>
                )}
              </div>
              {subscription.starts_at && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="font-medium">{formatDate(subscription.starts_at)}</p>
                </div>
              )}
              {subscription.ends_at && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {subscription.status === "active" ? "Renova em" : "Vence em"}
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(subscription.ends_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Awaiting payment — show PIX */}
            {subscription.status === "pending" && subscription.asaas_pix_payload && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Aguardando pagamento
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background rounded px-3 py-2 break-all font-mono">
                    {subscription.asaas_pix_payload}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(subscription.asaas_pix_payload!)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {subscription.asaas_payment_link && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={subscription.asaas_payment_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir página de pagamento
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* Active benefits + usage */}
            {subscription.status === "active" && subscription.pricing_tiers && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Até {subscription.pricing_tiers.max_contracts ?? "∞"} contratos PJ ativos incluídos
                </div>
                {subscription.pricing_tiers.max_contracts !== null && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Contratos PJ utilizados</span>
                      <span className={quota.atLimit ? "text-destructive font-bold" : quota.nearLimit ? "text-amber-600 font-bold" : "text-muted-foreground"}>
                        {quota.used} / {quota.limit}
                      </span>
                    </div>
                    <Progress
                      value={quota.percentUsed}
                      className={`h-2 ${
                        quota.atLimit
                          ? "[&>div]:bg-destructive"
                          : quota.nearLimit
                          ? "[&>div]:bg-amber-500"
                          : ""
                      }`}
                    />
                    {quota.nearLimit && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Você está usando {quota.percentUsed}% do seu limite. Considere fazer upgrade.
                      </p>
                    )}
                    {quota.atLimit && (
                      <p className="text-xs text-destructive">
                        🚫 Limite atingido. Faça upgrade para criar novos contratos PJ.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">Nenhum plano ativo</p>
              <p className="text-muted-foreground text-sm">Assine um plano para gerenciar seus contratos PJ</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setUpgradeOpen(true)}>
                Assinar agora
              </Button>
              <Button variant="outline" onClick={() => navigate("/precos")}>
                Ver planos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.plan_name}</TableCell>
                    <TableCell><CycleLabel cycle={sub.cycle} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(sub.total_charged)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.starts_at && formatDate(sub.starts_at)}
                      {sub.ends_at && ` → ${formatDate(sub.ends_at)}`}
                    </TableCell>
                    <TableCell><StatusBadge status={sub.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upgrade / New subscription dialog */}
      <Dialog open={upgradeOpen} onOpenChange={(open) => { setUpgradeOpen(open); if (!open) resetCoupon(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{subscription?.status === "active" ? "Trocar plano" : "Escolher plano"}</DialogTitle>
            <DialogDescription>
              {subscription?.status === "active"
                ? "Ao fazer upgrade você paga apenas o valor proporcional ao tempo restante."
                : "Escolha o plano que melhor atende sua empresa."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Cycle toggle */}
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
              <Button
                variant={upgradeCycle === "monthly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setUpgradeCycle("monthly")}
              >
                Mensal
              </Button>
              <Button
                variant={upgradeCycle === "annual" ? "default" : "ghost"}
                size="sm"
                onClick={() => setUpgradeCycle("annual")}
              >
                Anual
                <Badge variant="secondary" className="ml-2 text-green-600 text-xs">-15%</Badge>
              </Button>
            </div>

            {/* Tier cards */}
            {tiersQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {(tiersQuery.data ?? []).map((tier) => {
                  const monthly = tier.subscription_monthly_price ?? 0;
                  const annual = monthly * 12 * (1 - ANNUAL_DISCOUNT);
                  const price = upgradeCycle === "annual" ? annual : monthly;
                  const isCurrentPlan = subscription?.pricing_tier_id === tier.id;
                  const isSelected = selectedTier?.id === tier.id;

                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {tier.name}
                            {isCurrentPlan && <Badge variant="outline" className="text-xs">Plano atual</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tier.min_contracts}–{tier.max_contracts ?? "∞"} contratos PJ
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(price)}</p>
                          <p className="text-xs text-muted-foreground">
                            {upgradeCycle === "annual" ? "/ano" : "/mês"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coupon code section */}
          <div className="border-t pt-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setCouponOpen((v) => !v); setCouponError(null); }}
            >
              <Tag className="h-4 w-4" />
              Tenho um cupom de desconto
              <ChevronDown className={`h-4 w-4 transition-transform ${couponOpen ? "rotate-180" : ""}`} />
            </button>

            {couponOpen && (
              <div className="mt-3 space-y-2">
                {couponApplied ? (
                  <div className="flex items-center justify-between rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        <strong>{couponApplied.code}</strong> —{" "}
                        {couponApplied.discount_type === "percentage"
                          ? `${couponApplied.discount_value}% de desconto`
                          : `${formatCurrency(couponApplied.discount_value)} de desconto`}
                        {couponApplied.description && ` · ${couponApplied.description}`}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-red-500 hover:text-red-600"
                      onClick={() => { setCouponApplied(null); setCouponInput(""); }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="coupon-input" className="sr-only">Código do cupom</Label>
                      <Input
                        id="coupon-input"
                        placeholder="Ex: PROMO30"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => e.key === "Enter" && validateCoupon()}
                        className={couponError ? "border-destructive" : ""}
                      />
                      {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!couponInput.trim() || couponLoading}
                      onClick={validateCoupon}
                      className="shrink-0"
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUpgradeOpen(false); resetCoupon(); }}>Cancelar</Button>
            <Button
              disabled={!selectedTier || checkoutMutation.isPending}
              onClick={handleUpgrade}
            >
              {checkoutMutation.isPending
                ? "Processando..."
                : (() => {
                    const isActive = subscription?.status === "active";
                    if (!selectedTier) return isActive ? "Confirmar upgrade" : "Assinar";
                    const basePrice = upgradeCycle === "annual"
                      ? (selectedTier.subscription_monthly_price ?? 0) * 12 * (1 - ANNUAL_DISCOUNT)
                      : (selectedTier.subscription_monthly_price ?? 0);
                    if (couponApplied) {
                      const disc = couponApplied.discount_type === "percentage"
                        ? basePrice * couponApplied.discount_value / 100
                        : couponApplied.discount_value;
                      const final = Math.max(basePrice - disc, 0);
                      return final === 0
                        ? "Ativar gratuitamente"
                        : `${isActive ? "Confirmar upgrade" : "Assinar"} · ${formatCurrency(final)}`;
                    }
                    return isActive ? "Confirmar upgrade" : "Assinar";
                  })()
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog (PIX / link) */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-600" />
              Finalize o pagamento
            </DialogTitle>
            <DialogDescription>
              {paymentResult && (
                <>
                  {formatCurrency(paymentResult.amount)} — {paymentResult.cycle === "annual" ? "plano anual" : "plano mensal"}
                  {paymentResult.coupon_discount && (
                    <span className="ml-2 text-green-600 font-medium">
                      (desconto de {formatCurrency(paymentResult.coupon_discount)} aplicado)
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {paymentResult?.pix_payload && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">PIX — copia e cola</p>
                <div className="flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentResult.pix_payload)}&size=180x180`}
                    alt="QR Code PIX"
                    className="rounded-lg border"
                    width={180}
                    height={180}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted rounded px-3 py-2 break-all font-mono">
                    {paymentResult.pix_payload}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(paymentResult!.pix_payload!)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {paymentResult?.payment_link && (
              <Button variant="default" className="w-full" asChild>
                <a href={paymentResult.payment_link as string} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir página de pagamento
                </a>
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Após o pagamento, sua assinatura será ativada automaticamente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); subQuery.refetch(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Já paguei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
