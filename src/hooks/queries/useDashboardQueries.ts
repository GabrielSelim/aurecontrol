import { useQuery } from "@tanstack/react-query";
import {
  fetchContractsByUser,
  fetchPendingSignaturesByEmail,
  fetchContractDocumentById,
  fetchContract,
  fetchContractSalaries,
  fetchContractUserIds,
  fetchExpiringContracts,
} from "@/services/contractService";
import {
  countActiveProfilesByCompany,
  fetchProfilesByCompany,
} from "@/services/profileService";
import {
  countPaymentsByUser,
  countPendingPayments,
  fetchPaidPaymentsInRange,
  countOverduePayments,
} from "@/services/paymentService";
import { fetchCompany } from "@/services/companyService";
import { auditLogsTable } from "@/integrations/supabase/extraTypes";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { queryKeys } from "./queryKeys";

/* ------------------------------------------------------------------ */
/*  Shared types                                                      */
/* ------------------------------------------------------------------ */

export interface AdminStats {
  totalColaboradores: number;
  contratosAtivos: number;
  pagamentosPendentes: number;
  pagamentosMes: number;
  custoPrevistoProximoMes: number;
}

export interface ColaboradorStats {
  meusContratos: number;
  contratosPendentesAssinatura: number;
  meusPagamentos: number;
}

export interface PendingSignature {
  id: string;
  contractId: string;
  jobTitle: string;
  companyName: string;
  createdAt: string;
}

export interface MyContract {
  id: string;
  jobTitle: string;
  contractType: string;
  status: string;
  startDate: string;
}

export interface DashboardAlert {
  id: string;
  type: "warning" | "danger" | "info";
  message: string;
  link: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  actorName: string;
  contractJobTitle: string;
  createdAt: string;
}

export interface HealthData {
  score: number;
  label: string;
  color: string;
  details: string[];
}

export interface NextAction {
  id: string;
  label: string;
  link: string;
  icon: "contract" | "payment" | "user";
}

interface AdminData {
  adminStats: AdminStats;
  sparklineData: { month: string; value: number }[];
  alerts: DashboardAlert[];
  healthData: HealthData;
  nextActions: NextAction[];
  recentActivities: RecentActivity[];
}

interface ColaboradorData {
  colaboradorStats: ColaboradorStats;
  pendingSignatures: PendingSignature[];
  myContracts: MyContract[];
}

/* ------------------------------------------------------------------ */
/*  Admin overview query                                              */
/* ------------------------------------------------------------------ */

export function useDashboardAdmin(companyId: string | undefined) {
  return useQuery<AdminData>({
    queryKey: queryKeys.dashboard.adminStats(companyId!),
    queryFn: async (): Promise<AdminData> => {
      const cid = companyId!;

      const colaboradoresCount = await countActiveProfilesByCompany(cid);
      const activeContractSalaries = await fetchContractSalaries(cid, "active");
      const contratosCount = activeContractSalaries.length;
      const pagamentosPendentesCount = await countPendingPayments(cid);

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const pagamentosMes = await fetchPaidPaymentsInRange({
        companyId: cid,
        fromDate: currentMonthStart.toISOString(),
        toDate: endOfMonth(now).toISOString(),
      });

      const totalPagamentosMes = pagamentosMes.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      const custoPrevistoProximoMes = activeContractSalaries.reduce(
        (sum, c) => sum + Number(c.salary || 0),
        0
      );

      const adminStats: AdminStats = {
        totalColaboradores: colaboradoresCount,
        contratosAtivos: contratosCount,
        pagamentosPendentes: pagamentosPendentesCount,
        pagamentosMes: totalPagamentosMes,
        custoPrevistoProximoMes,
      };

      // Sparkline: last 3 months
      const sparklineData: { month: string; value: number }[] = [];
      for (let i = 2; i >= 0; i--) {
        const mDate = subMonths(now, i);
        const mStart = startOfMonth(mDate);
        const mEnd = endOfMonth(mDate);
        const mPayments = await fetchPaidPaymentsInRange({
          companyId: cid,
          fromDate: mStart.toISOString().split("T")[0],
          toDate: mEnd.toISOString().split("T")[0],
        });
        const mTotal = mPayments.reduce((s, p) => s + Number(p.amount), 0);
        sparklineData.push({
          month: format(mDate, "MMM", { locale: ptBR }),
          value: mTotal,
        });
      }

      // Alerts
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringContracts = await fetchExpiringContracts(
        cid,
        now.toISOString().split("T")[0],
        thirtyDaysFromNow.toISOString().split("T")[0]
      );

      const allProfiles = await fetchProfilesByCompany(cid, {
        isActive: true,
        select: "user_id, full_name",
      });

      const allContracts = await fetchContractUserIds(cid, "active");
      const usersWithContract = new Set(allContracts.map((c) => c.user_id));
      const usersWithoutContract = allProfiles.filter(
        (p) => !usersWithContract.has(p.user_id as string)
      );

      const overduePaymentsCount = await countOverduePayments({
        companyId: cid,
        beforeDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const alerts: DashboardAlert[] = [];
      if (expiringContracts.length > 0) {
        alerts.push({
          id: "expiring-contracts",
          type: "warning",
          message: `${expiringContracts.length} contrato(s) vencem nos próximos 30 dias`,
          link: "/dashboard/contratos",
        });
      }
      if (overduePaymentsCount > 0) {
        alerts.push({
          id: "overdue-payments",
          type: "danger",
          message: `${overduePaymentsCount} pagamento(s) pendente(s) há mais de 30 dias`,
          link: "/dashboard/pagamentos",
        });
      }
      if (usersWithoutContract.length > 0) {
        alerts.push({
          id: "no-contract",
          type: "info",
          message: `${usersWithoutContract.length} colaborador(es) sem contrato vinculado`,
          link: "/dashboard/colaboradores",
        });
      }

      // Health score
      const totalContracts = contratosCount + expiringContracts.length;
      const contractHealthPct =
        totalContracts > 0 ? (contratosCount / totalContracts) * 100 : 100;
      const totalPayments = pagamentosPendentesCount + pagamentosMes.length;
      const paymentHealthPct =
        totalPayments > 0 ? (pagamentosMes.length / totalPayments) * 100 : 100;
      const healthScore = Math.round((contractHealthPct + paymentHealthPct) / 2);

      const healthDetails: string[] = [];
      if (expiringContracts.length > 0)
        healthDetails.push(`${expiringContracts.length} contrato(s) vencendo`);
      if (overduePaymentsCount > 0)
        healthDetails.push(`${overduePaymentsCount} pagamento(s) atrasado(s)`);
      if (usersWithoutContract.length > 0)
        healthDetails.push(`${usersWithoutContract.length} sem contrato`);
      if (healthDetails.length === 0) healthDetails.push("Tudo em ordem!");

      const healthData: HealthData = {
        score: healthScore,
        label:
          healthScore >= 80 ? "Boa" : healthScore >= 50 ? "Atenção" : "Crítica",
        color:
          healthScore >= 80
            ? "text-green-600"
            : healthScore >= 50
              ? "text-amber-600"
              : "text-red-600",
        details: healthDetails,
      };

      // Next actions
      const nextActions: NextAction[] = [];
      if (pagamentosPendentesCount > 0) {
        nextActions.push({
          id: "approve-payments",
          label: `Aprovar ${pagamentosPendentesCount} pagamento(s) pendente(s)`,
          link: "/dashboard/pagamentos",
          icon: "payment",
        });
      }
      if (expiringContracts.length > 0) {
        nextActions.push({
          id: "review-expiring",
          label: `Revisar ${expiringContracts.length} contrato(s) vencendo`,
          link: "/dashboard/contratos",
          icon: "contract",
        });
      }
      if (usersWithoutContract.length > 0) {
        nextActions.push({
          id: "assign-contracts",
          label: `Vincular contrato a ${usersWithoutContract.length} colaborador(es)`,
          link: "/dashboard/contratos",
          icon: "user",
        });
      }

      // Recent activity
      let recentActivities: RecentActivity[] = [];
      try {
        const { data: auditLogs } = await auditLogsTable()
          .select(
            "id, action, actor_name, created_at, contract_id, contracts(job_title)"
          )
          .eq("contracts.company_id", cid)
          .order("created_at", { ascending: false })
          .limit(5);

        if (auditLogs && auditLogs.length > 0) {
          recentActivities = (auditLogs as unknown as Record<string, unknown>[]).map(
            (log) => ({
              id: log.id as string,
              action: log.action as string,
              actorName: log.actor_name as string,
              contractJobTitle:
                (log.contracts as Record<string, string> | null)?.job_title ||
                "",
              createdAt: log.created_at as string,
            })
          );
        }
      } catch {
        // audit logs table might not exist yet
      }

      return {
        adminStats,
        sparklineData,
        alerts,
        healthData,
        nextActions,
        recentActivities,
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 min — dashboard stats are more dynamic
  });
}

/* ------------------------------------------------------------------ */
/*  Colaborador overview query                                        */
/* ------------------------------------------------------------------ */

export function useDashboardColaborador(
  userId: string | undefined,
  email: string | undefined
) {
  return useQuery<ColaboradorData>({
    queryKey: queryKeys.dashboard.colaboradorStats(userId!),
    queryFn: async (): Promise<ColaboradorData> => {
      const uid = userId!;

      const contracts = await fetchContractsByUser(uid);

      const rawSignatures = await fetchPendingSignaturesByEmail(email || "");
      const pendingSignatures: PendingSignature[] = [];
      for (const sig of rawSignatures) {
        try {
          const doc = await fetchContractDocumentById(sig.document_id);
          if (!doc?.contract_id) continue;
          const contract = await fetchContract(doc.contract_id);
          if (!contract) continue;
          let companyName = "";
          try {
            const company = await fetchCompany(contract.company_id);
            companyName = company?.name || "";
          } catch {
            /* ignore */
          }
          pendingSignatures.push({
            id: sig.id,
            contractId: contract.id,
            jobTitle: contract.job_title,
            companyName,
            createdAt: contract.created_at || "",
          });
        } catch {
          // Skip signatures with missing data
        }
      }

      const pagamentosCount = await countPaymentsByUser(uid);

      const myContracts: MyContract[] = contracts.map(
        (contract: Record<string, unknown>) => ({
          id: contract.id as string,
          jobTitle: contract.job_title as string,
          contractType: contract.contract_type as string,
          status: contract.status as string,
          startDate: contract.start_date as string,
        })
      );

      return {
        colaboradorStats: {
          meusContratos: contracts.length,
          contratosPendentesAssinatura: pendingSignatures.length,
          meusPagamentos: pagamentosCount,
        },
        pendingSignatures,
        myContracts,
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
