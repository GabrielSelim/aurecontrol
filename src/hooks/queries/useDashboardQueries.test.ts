import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Mock services                                                     */
/* ------------------------------------------------------------------ */
vi.mock("@/services/contractService", () => ({
  fetchContractsByUser: vi.fn(),
  fetchPendingSignaturesByEmail: vi.fn(),
  fetchContractDocumentById: vi.fn(),
  fetchContract: vi.fn(),
  fetchContractSalaries: vi.fn(),
  fetchContractUserIds: vi.fn(),
  fetchExpiringContracts: vi.fn(),
  countActiveContractsByType: vi.fn(),
}));

vi.mock("@/services/profileService", () => ({
  countActiveProfilesByCompany: vi.fn(),
  fetchProfilesByCompany: vi.fn(),
}));

vi.mock("@/services/paymentService", () => ({
  countPaymentsByUser: vi.fn(),
  countPendingPayments: vi.fn(),
  fetchPaidPaymentsInRange: vi.fn(),
  countOverduePayments: vi.fn(),
}));

vi.mock("@/services/companyService", () => ({
  fetchCompany: vi.fn(),
}));

// Mock auditLogsTable — returns a Supabase query builder mock
const auditSelectMock = vi.fn();
const auditEqMock = vi.fn();
const auditOrderMock = vi.fn();
const auditLimitMock = vi.fn();

vi.mock("@/integrations/supabase/extraTypes", () => ({
  auditLogsTable: vi.fn(() => ({
    select: auditSelectMock,
  })),
}));

import {
  fetchContractsByUser,
  fetchPendingSignaturesByEmail,
  fetchContractDocumentById,
  fetchContract,
  fetchContractSalaries,
  fetchContractUserIds,
  fetchExpiringContracts,
  countActiveContractsByType,
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

import {
  useDashboardAdmin,
  useDashboardColaborador,
} from "./useDashboardQueries";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const m = {
  countActiveProfilesByCompany: countActiveProfilesByCompany as ReturnType<typeof vi.fn>,
  fetchContractSalaries: fetchContractSalaries as ReturnType<typeof vi.fn>,
  countActiveContractsByType: countActiveContractsByType as ReturnType<typeof vi.fn>,
  countPendingPayments: countPendingPayments as ReturnType<typeof vi.fn>,
  fetchPaidPaymentsInRange: fetchPaidPaymentsInRange as ReturnType<typeof vi.fn>,
  fetchExpiringContracts: fetchExpiringContracts as ReturnType<typeof vi.fn>,
  fetchProfilesByCompany: fetchProfilesByCompany as ReturnType<typeof vi.fn>,
  fetchContractUserIds: fetchContractUserIds as ReturnType<typeof vi.fn>,
  countOverduePayments: countOverduePayments as ReturnType<typeof vi.fn>,
  fetchContractsByUser: fetchContractsByUser as ReturnType<typeof vi.fn>,
  fetchPendingSignaturesByEmail: fetchPendingSignaturesByEmail as ReturnType<typeof vi.fn>,
  fetchContractDocumentById: fetchContractDocumentById as ReturnType<typeof vi.fn>,
  fetchContract: fetchContract as ReturnType<typeof vi.fn>,
  fetchCompany: fetchCompany as ReturnType<typeof vi.fn>,
  countPaymentsByUser: countPaymentsByUser as ReturnType<typeof vi.fn>,
};

beforeEach(() => {
  vi.clearAllMocks();
  // countActiveContractsByType defaults to 0 for PJ and CLT
  (countActiveContractsByType as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  // Set up audit logs chain → returns empty by default
  auditSelectMock.mockReturnValue({ eq: auditEqMock });
  auditEqMock.mockReturnValue({ order: auditOrderMock });
  auditOrderMock.mockReturnValue({ limit: auditLimitMock });
  auditLimitMock.mockResolvedValue({ data: [], error: null });
});

/* ------------------------------------------------------------------ */
/*  useDashboardAdmin                                                 */
/* ------------------------------------------------------------------ */

describe("useDashboardAdmin", () => {
  it("is disabled when companyId is undefined", () => {
    const { result } = renderHook(() => useDashboardAdmin(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns admin stats, alerts, health and sparkline", async () => {
    m.countActiveProfilesByCompany.mockResolvedValue(10);
    m.fetchContractSalaries.mockResolvedValue([
      { salary: 5000 },
      { salary: 3000 },
    ]);
    m.countPendingPayments.mockResolvedValue(2);
    // fetchPaidPaymentsInRange is called 4 times: current month + 3 sparkline months
    m.fetchPaidPaymentsInRange.mockResolvedValue([{ amount: 8000 }]);
    m.fetchExpiringContracts.mockResolvedValue([{ id: "ct-1" }]);
    m.fetchProfilesByCompany.mockResolvedValue([
      { user_id: "u-1", full_name: "Alice" },
      { user_id: "u-2", full_name: "Bob" },
    ]);
    m.fetchContractUserIds.mockResolvedValue([{ user_id: "u-1" }]);
    m.countOverduePayments.mockResolvedValue(1);

    const { result } = renderHook(() => useDashboardAdmin("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;

    // Admin stats
    expect(data.adminStats.totalColaboradores).toBe(10);
    expect(data.adminStats.contratosAtivos).toBe(2);
    expect(data.adminStats.pagamentosPendentes).toBe(2);
    expect(data.adminStats.custoPrevistoProximoMes).toBe(8000);

    // Sparkline: 3 months
    expect(data.sparklineData).toHaveLength(3);
    expect(data.sparklineData[0].value).toBe(8000);

    // Alerts: expiring + overdue + no-contract
    expect(data.alerts).toHaveLength(3);
    expect(data.alerts.map((a) => a.id)).toContain("expiring-contracts");
    expect(data.alerts.map((a) => a.id)).toContain("overdue-payments");
    expect(data.alerts.map((a) => a.id)).toContain("no-contract");

    // Health
    expect(data.healthData.score).toBeGreaterThanOrEqual(0);
    expect(data.healthData.score).toBeLessThanOrEqual(100);
    expect(["Boa", "Atenção", "Crítica"]).toContain(data.healthData.label);

    // Next actions
    expect(data.nextActions.length).toBeGreaterThan(0);
  });

  it("returns clean health when no issues", async () => {
    m.countActiveProfilesByCompany.mockResolvedValue(5);
    m.fetchContractSalaries.mockResolvedValue([{ salary: 5000 }]);
    m.countPendingPayments.mockResolvedValue(0);
    m.fetchPaidPaymentsInRange.mockResolvedValue([]);
    m.fetchExpiringContracts.mockResolvedValue([]);
    m.fetchProfilesByCompany.mockResolvedValue([{ user_id: "u-1" }]);
    m.fetchContractUserIds.mockResolvedValue([{ user_id: "u-1" }]);
    m.countOverduePayments.mockResolvedValue(0);

    const { result } = renderHook(() => useDashboardAdmin("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.alerts).toEqual([]);
    expect(result.current.data!.healthData.details).toContain("Tudo em ordem!");
    expect(result.current.data!.nextActions).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  useDashboardColaborador                                           */
/* ------------------------------------------------------------------ */

describe("useDashboardColaborador", () => {
  it("is disabled when userId is undefined", () => {
    const { result } = renderHook(
      () => useDashboardColaborador(undefined, "user@test.com"),
      { wrapper: createWrapper() }
    );
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns colaborador stats, contracts and pending signatures", async () => {
    m.fetchContractsByUser.mockResolvedValue([
      { id: "ct-1", job_title: "Dev", contract_type: "PJ", status: "active", start_date: "2025-01-01" },
    ]);
    m.fetchPendingSignaturesByEmail.mockResolvedValue([
      { id: "sig-1", document_id: "d-1" },
    ]);
    m.fetchContractDocumentById.mockResolvedValue({ contract_id: "ct-1" });
    m.fetchContract.mockResolvedValue({
      id: "ct-1",
      company_id: "c-1",
      job_title: "Dev",
      created_at: "2025-01-01",
    });
    m.fetchCompany.mockResolvedValue({ name: "Corp" });
    m.countPaymentsByUser.mockResolvedValue(3);

    const { result } = renderHook(
      () => useDashboardColaborador("u-1", "user@test.com"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.colaboradorStats.meusContratos).toBe(1);
    expect(data.colaboradorStats.contratosPendentesAssinatura).toBe(1);
    expect(data.colaboradorStats.meusPagamentos).toBe(3);
    expect(data.pendingSignatures).toHaveLength(1);
    expect(data.pendingSignatures[0].companyName).toBe("Corp");
    expect(data.myContracts).toHaveLength(1);
  });

  it("skips signatures with missing document data", async () => {
    m.fetchContractsByUser.mockResolvedValue([]);
    m.fetchPendingSignaturesByEmail.mockResolvedValue([
      { id: "sig-1", document_id: "d-1" },
    ]);
    m.fetchContractDocumentById.mockResolvedValue(null); // no contract_id
    m.countPaymentsByUser.mockResolvedValue(0);

    const { result } = renderHook(
      () => useDashboardColaborador("u-1", "user@test.com"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.pendingSignatures).toEqual([]);
  });

  it("handles company fetch failure gracefully", async () => {
    m.fetchContractsByUser.mockResolvedValue([]);
    m.fetchPendingSignaturesByEmail.mockResolvedValue([
      { id: "sig-1", document_id: "d-1" },
    ]);
    m.fetchContractDocumentById.mockResolvedValue({ contract_id: "ct-1" });
    m.fetchContract.mockResolvedValue({
      id: "ct-1",
      company_id: "c-1",
      job_title: "Dev",
      created_at: "2025-01-01",
    });
    m.fetchCompany.mockRejectedValue(new Error("not found"));
    m.countPaymentsByUser.mockResolvedValue(0);

    const { result } = renderHook(
      () => useDashboardColaborador("u-1", "user@test.com"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.pendingSignatures[0].companyName).toBe("");
  });
});
