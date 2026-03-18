import { useNavigate } from "react-router-dom";
import { AlertTriangle, XCircle, ArrowUpCircle, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSignatureQuota } from "@/hooks/queries/useSubscriptionQueries";

/**
 * Banner shown in the Contratos page to warn admins about:
 * 1. No active plan (can't create PJ contracts)
 * 2. Near limit (≥ 80% used)
 * 3. At limit (100% — creation is blocked)
 */
export function SignatureQuotaBanner() {
  const navigate = useNavigate();
  const quota = useSignatureQuota();

  if (quota.isLoading) return null;

  /* ── No active subscription ─────────────────────────────────── */
  if (!quota.hasActiveSubscription) {
    return (
      <Alert className="border-primary/40 bg-primary/5 mb-4">
        <Zap className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Plano necessário para contratos PJ</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3 flex-wrap mt-1">
          <span className="text-sm">
            Assine um plano para criar contratos PJ com assinatura digital.
          </span>
          <Button size="sm" onClick={() => navigate("/dashboard/meu-plano")}>
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Ver planos
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  /* ── Quota limit reached ────────────────────────────────────── */
  if (quota.atLimit) {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Limite de contratos PJ atingido</AlertTitle>
        <AlertDescription className="space-y-3 mt-1">
          <p className="text-sm">
            Você utiliza <strong>{quota.used}</strong> de{" "}
            <strong>{quota.limit}</strong> contratos PJ do plano{" "}
            <strong>{quota.subscription?.plan_name}</strong>.
            Faça upgrade para criar novos contratos.
          </p>
          <Progress value={100} className="h-2" />
          <Button
            size="sm"
            variant="outline"
            className="border-current text-current hover:bg-current/10"
            onClick={() => navigate("/dashboard/meu-plano")}
          >
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Aumentar plano
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  /* ── Near limit warning ─────────────────────────────────────── */
  if (quota.nearLimit) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/5 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">
          Perto do limite de contratos PJ
        </AlertTitle>
        <AlertDescription className="space-y-3 mt-1">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>{quota.used}</strong> de <strong>{quota.limit}</strong> contratos PJ
            utilizados ({quota.percentUsed}%) — plano{" "}
            <strong>{quota.subscription?.plan_name}</strong>.
          </p>
          <Progress
            value={quota.percentUsed}
            className="h-2 [&>div]:bg-amber-500"
          />
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
            onClick={() => navigate("/dashboard/meu-plano")}
          >
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Aumentar plano
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Compact inline badge showing quota usage — embeds in any card/header.
 * Shows "X / Y contratos PJ" with a small progress bar.
 */
export function SignatureQuotaIndicator() {
  const navigate = useNavigate();
  const quota = useSignatureQuota();

  if (quota.isLoading || !quota.hasActiveSubscription) return null;
  if (quota.limit === null) return null; // unlimited plan

  const color =
    quota.atLimit
      ? "text-destructive"
      : quota.nearLimit
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <button
      className="flex items-center gap-2 text-xs hover:underline"
      onClick={() => navigate("/dashboard/meu-plano")}
      title="Ver detalhes do plano"
    >
      <span className={`font-medium ${color}`}>
        {quota.used} / {quota.limit} contratos PJ
      </span>
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            quota.atLimit
              ? "bg-destructive"
              : quota.nearLimit
              ? "bg-amber-500"
              : "bg-primary"
          }`}
          style={{ width: `${Math.min(100, quota.percentUsed)}%` }}
        />
      </div>
    </button>
  );
}
