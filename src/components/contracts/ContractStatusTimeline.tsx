import { cn } from "@/lib/utils";
import {
  FilePlus,
  Send,
  Eye,
  PenLine,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays, parseISO } from "date-fns";

interface ContractStatusTimelineProps {
  status: string;
  endDate?: string | null;
  createdAt?: string;
  className?: string;
}

type StepKey =
  | "em_criacao"
  | "enviado"
  | "em_revisao"
  | "assinado"
  | "active"
  | "terminated"
  | "renovado"
  | "suspended";

interface Step {
  key: StepKey | "vencendo";
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeBorder: string;
}

// ─── Fluxo principal (linear) ────────────────────────────
const MAIN_STEPS: Step[] = [
  {
    key: "em_criacao",
    label: "Em Criação",
    description: "Contrato sendo redigido pelo administrador",
    icon: FilePlus,
    color: "text-slate-500",
    activeBg: "bg-slate-100 dark:bg-slate-800",
    activeBorder: "border-slate-400",
  },
  {
    key: "enviado",
    label: "Enviado",
    description: "Aguardando revisão pelo prestador",
    icon: Send,
    color: "text-blue-500",
    activeBg: "bg-blue-50 dark:bg-blue-900/20",
    activeBorder: "border-blue-400",
  },
  {
    key: "em_revisao",
    label: "Em Revisão",
    description: "Em negociação / solicitação de ajuste",
    icon: Eye,
    color: "text-orange-500",
    activeBg: "bg-orange-50 dark:bg-orange-900/20",
    activeBorder: "border-orange-400",
  },
  {
    key: "assinado",
    label: "Assinado",
    description: "Assinaturas coletadas, aguardando ativação",
    icon: PenLine,
    color: "text-violet-500",
    activeBg: "bg-violet-50 dark:bg-violet-900/20",
    activeBorder: "border-violet-400",
  },
  {
    key: "active",
    label: "Vigente",
    description: "Contrato em execução",
    icon: CheckCircle2,
    color: "text-green-600",
    activeBg: "bg-green-50 dark:bg-green-900/20",
    activeBorder: "border-green-500",
  },
  {
    key: "terminated",
    label: "Encerrado",
    description: "Contrato finalizado",
    icon: XCircle,
    color: "text-red-500",
    activeBg: "bg-red-50 dark:bg-red-900/20",
    activeBorder: "border-red-400",
  },
];

// Índice de cada estado no fluxo principal (suspended/renovado são laterais)
const STEP_ORDER: Record<string, number> = {
  em_criacao: 0,
  enviado: 1,
  em_revisao: 2,
  assinado: 3,
  active: 4,
  terminated: 5,
  renovado: 5, // mesmo nível que terminated
  suspended: 4, // ocorre depois de active
};

export function ContractStatusTimeline({
  status,
  endDate,
  createdAt: _createdAt,
  className,
}: ContractStatusTimelineProps) {
  // Dias até vencer (para badge "Vencendo")
  const daysUntilEnd =
    endDate && status === "active"
      ? differenceInDays(parseISO(endDate), new Date())
      : null;
  const isExpiring = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30;

  // Normaliza: suspended é visualmente no nó "active"
  const effectiveStatus = status === "suspended" ? "active" : status;
  const currentIdx = STEP_ORDER[effectiveStatus] ?? 0;

  // Para renovado, substituímos o step "terminated" pelo "renovado"
  const steps =
    status === "renovado"
      ? MAIN_STEPS.map((s) =>
          s.key === "terminated"
            ? {
                ...s,
                key: "renovado" as const,
                label: "Renovado",
                description: "Contrato renovado com novo período",
                icon: RotateCcw,
                color: "text-teal-600",
                activeBg: "bg-teal-50 dark:bg-teal-900/20",
                activeBorder: "border-teal-500",
              }
            : s
        )
      : MAIN_STEPS;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("w-full", className)}>
        {/* ─── Side badges ────────── */}
        {(status === "suspended" || isExpiring) && (
          <div className="flex gap-2 mb-3">
            {status === "suspended" && (
              <Badge
                variant="outline"
                className="gap-1.5 border-slate-400 text-slate-600 bg-slate-50"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                Suspenso
              </Badge>
            )}
            {isExpiring && (
              <Badge
                variant="outline"
                className="gap-1.5 border-amber-400 text-amber-700 bg-amber-50"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Vencendo em {daysUntilEnd}d
              </Badge>
            )}
          </div>
        )}

        {/* ─── Timeline steps ──────── */}
        <div className="relative flex items-start justify-between gap-0">
          {steps.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isPending = idx > currentIdx;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                {/* Connector line (left side) */}
                {idx > 0 && (
                  <div
                    className={cn(
                      "absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2",
                      idx <= currentIdx
                        ? "bg-primary/60"
                        : "bg-border"
                    )}
                  />
                )}

                {/* Node */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                        isCurrent && [step.activeBg, step.activeBorder, "shadow-sm ring-2 ring-offset-1 ring-primary/30"],
                        isDone && "bg-primary/10 border-primary/60",
                        isPending && "bg-muted border-border"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isCurrent && step.color,
                          isDone && "text-primary/70",
                          isPending && "text-muted-foreground/40"
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[180px] text-center text-xs">
                    {step.description}
                  </TooltipContent>
                </Tooltip>

                {/* Label */}
                <span
                  className={cn(
                    "mt-1.5 text-[10px] font-medium text-center leading-tight max-w-[64px]",
                    isCurrent && "text-foreground",
                    isDone && "text-muted-foreground",
                    isPending && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
