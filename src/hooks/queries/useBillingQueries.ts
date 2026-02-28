import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllBillings,
  createBilling,
  markBillingAsPaid,
  cancelBilling,
} from "@/services/paymentService";
import { fetchCompaniesByIds, fetchActiveCompanies } from "@/services/companyService";
import { countActivePJContracts } from "@/services/contractService";
import { fetchSystemSetting, fetchActivePricingTiers } from "@/services/settingsService";
import { queryKeys } from "./queryKeys";

/* ------------------------------------------------------------------ */
/*  Shared types                                                      */
/* ------------------------------------------------------------------ */

export interface BillingWithCompany {
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

export interface BillingStats {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                           */
/* ------------------------------------------------------------------ */

/**
 * Fetches all billings with company info and computes aggregate stats.
 * Combines multiple service calls into a single cached result.
 */
export function useBillingsWithCompanies() {
  return useQuery({
    queryKey: queryKeys.billings.list(),
    queryFn: async (): Promise<{
      billings: BillingWithCompany[];
      stats: BillingStats;
    }> => {
      const billingsData = await fetchAllBillings();

      let billings: BillingWithCompany[] = [];

      if (billingsData.length > 0) {
        const companyIds = [...new Set(billingsData.map((b) => b.company_id))];
        const companiesData = await fetchCompaniesByIds(companyIds);

        billings = billingsData.map((billing) => ({
          ...billing,
          company: companiesData?.find((c) => c.id === billing.company_id),
        })) as BillingWithCompany[];
      }

      // Compute stats
      const pending = billingsData.filter((b) => b.status === "pending");
      const paid = billingsData.filter((b) => b.status === "paid");
      const overdue = billingsData.filter((b) => b.status === "overdue");

      const stats: BillingStats = {
        totalPending: pending.reduce((sum, b) => sum + Number(b.total), 0),
        totalPaid: paid.reduce((sum, b) => sum + Number(b.total), 0),
        totalOverdue: overdue.reduce((sum, b) => sum + Number(b.total), 0),
        pendingCount: pending.length,
        paidCount: paid.length,
        overdueCount: overdue.length,
      };

      return { billings, stats };
    },
  });
}

/**
 * Fetches active companies for the "generate billing" dialog select.
 * Re-uses the existing company key with an active filter.
 */
export function useActiveCompaniesForBilling() {
  return useQuery({
    queryKey: queryKeys.companies.list({ active: true, context: "billing" }),
    queryFn: fetchActiveCompanies,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                         */
/* ------------------------------------------------------------------ */

interface CreateBillingInput {
  selectedCompany: string;
  referenceMonth: string;
}

/**
 * Creates a billing by resolving PJ contract count, pricing tier,
 * and due date before inserting.
 */
export function useCreateBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBillingInput) => {
      const pjCount = await countActivePJContracts(input.selectedCompany);

      const settingValue = await fetchSystemSetting("pj_contract_price");
      const basePrice =
        (settingValue as unknown as { amount: number })?.amount || 49.9;

      const tiers = await fetchActivePricingTiers();

      let unitPrice = basePrice;
      if (tiers && pjCount) {
        const applicableTier = tiers.find(
          (t) =>
            pjCount >= t.min_contracts &&
            (t.max_contracts === null || pjCount <= t.max_contracts),
        );
        if (applicableTier) {
          unitPrice = applicableTier.price_per_contract;
        }
      }

      const contractsCount = pjCount || 0;
      const subtotal = contractsCount * unitPrice;
      const total = subtotal;

      const refDate = new Date(input.referenceMonth + "-01");
      const dueDate = new Date(
        refDate.getFullYear(),
        refDate.getMonth() + 1,
        10,
      );

      return createBilling({
        company_id: input.selectedCompany,
        reference_month: input.referenceMonth + "-01",
        pj_contracts_count: contractsCount,
        unit_price: unitPrice,
        subtotal,
        total,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.billings.all });
    },
  });
}

/**
 * Marks a billing as paid with a specific payment method.
 */
export function useMarkBillingAsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      billingId,
      paymentMethod,
    }: {
      billingId: string;
      paymentMethod: string;
    }) => markBillingAsPaid(billingId, paymentMethod),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.billings.all });
    },
  });
}

/**
 * Cancels a billing.
 */
export function useCancelBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (billingId: string) => cancelBilling(billingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.billings.all });
    },
  });
}
