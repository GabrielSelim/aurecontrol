import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Mock services                                                     */
/* ------------------------------------------------------------------ */
vi.mock("@/services/paymentService", () => ({
  fetchAllBillings: vi.fn(),
  createBilling: vi.fn(),
  markBillingAsPaid: vi.fn(),
  cancelBilling: vi.fn(),
}));

vi.mock("@/services/companyService", () => ({
  fetchCompaniesByIds: vi.fn(),
  fetchActiveCompanies: vi.fn(),
}));

vi.mock("@/services/contractService", () => ({
  countActivePJContracts: vi.fn(),
}));

vi.mock("@/services/settingsService", () => ({
  fetchSystemSetting: vi.fn(),
  fetchActivePricingTiers: vi.fn(),
}));

import { fetchAllBillings, createBilling, markBillingAsPaid, cancelBilling } from "@/services/paymentService";
import { fetchCompaniesByIds, fetchActiveCompanies } from "@/services/companyService";
import { countActivePJContracts } from "@/services/contractService";
import { fetchSystemSetting, fetchActivePricingTiers } from "@/services/settingsService";

import {
  useBillingsWithCompanies,
  useActiveCompaniesForBilling,
  useCreateBilling,
  useMarkBillingAsPaid,
  useCancelBilling,
} from "./useBillingQueries";

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

const mockedFetchAllBillings = fetchAllBillings as ReturnType<typeof vi.fn>;
const mockedFetchCompaniesByIds = fetchCompaniesByIds as ReturnType<typeof vi.fn>;
const mockedFetchActiveCompanies = fetchActiveCompanies as ReturnType<typeof vi.fn>;
const mockedCreateBilling = createBilling as ReturnType<typeof vi.fn>;
const mockedMarkBillingAsPaid = markBillingAsPaid as ReturnType<typeof vi.fn>;
const mockedCancelBilling = cancelBilling as ReturnType<typeof vi.fn>;
const mockedCountActivePJContracts = countActivePJContracts as ReturnType<typeof vi.fn>;
const mockedFetchSystemSetting = fetchSystemSetting as ReturnType<typeof vi.fn>;
const mockedFetchActivePricingTiers = fetchActivePricingTiers as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  useBillingsWithCompanies                                          */
/* ------------------------------------------------------------------ */

describe("useBillingsWithCompanies", () => {
  it("fetches billings with company info and computes stats", async () => {
    mockedFetchAllBillings.mockResolvedValue([
      { id: "b-1", company_id: "c-1", total: 100, status: "pending" },
      { id: "b-2", company_id: "c-1", total: 200, status: "paid" },
    ]);
    mockedFetchCompaniesByIds.mockResolvedValue([
      { id: "c-1", name: "Corp", cnpj: "12345" },
    ]);

    const { result } = renderHook(() => useBillingsWithCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.billings).toHaveLength(2);
    expect(result.current.data!.billings[0].company?.name).toBe("Corp");
    expect(result.current.data!.stats.totalPending).toBe(100);
    expect(result.current.data!.stats.totalPaid).toBe(200);
    expect(result.current.data!.stats.pendingCount).toBe(1);
    expect(result.current.data!.stats.paidCount).toBe(1);
  });

  it("returns empty billings and zero stats when no data", async () => {
    mockedFetchAllBillings.mockResolvedValue([]);

    const { result } = renderHook(() => useBillingsWithCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.billings).toEqual([]);
    expect(result.current.data!.stats.totalPending).toBe(0);
  });

  it("sets isError on failure", async () => {
    mockedFetchAllBillings.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useBillingsWithCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

/* ------------------------------------------------------------------ */
/*  useActiveCompaniesForBilling                                      */
/* ------------------------------------------------------------------ */

describe("useActiveCompaniesForBilling", () => {
  it("returns active companies", async () => {
    const companies = [{ id: "c-1", name: "Corp" }];
    mockedFetchActiveCompanies.mockResolvedValue(companies);

    const { result } = renderHook(() => useActiveCompaniesForBilling(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(companies);
  });
});

/* ------------------------------------------------------------------ */
/*  useCreateBilling                                                  */
/* ------------------------------------------------------------------ */

describe("useCreateBilling", () => {
  it("resolves pricing and creates billing", async () => {
    mockedCountActivePJContracts.mockResolvedValue(5);
    mockedFetchSystemSetting.mockResolvedValue({ amount: 49.9 });
    mockedFetchActivePricingTiers.mockResolvedValue([
      { min_contracts: 1, max_contracts: 10, price_per_contract: 39.9 },
    ]);
    mockedCreateBilling.mockResolvedValue({ id: "b-new" });

    const { result } = renderHook(() => useCreateBilling(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      selectedCompany: "c-1",
      referenceMonth: "2025-06",
    });

    expect(mockedCreateBilling).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "c-1",
        pj_contracts_count: 5,
        unit_price: 39.9,
        status: "pending",
      })
    );
  });

  it("uses base price when no matching tier", async () => {
    mockedCountActivePJContracts.mockResolvedValue(100);
    mockedFetchSystemSetting.mockResolvedValue({ amount: 49.9 });
    mockedFetchActivePricingTiers.mockResolvedValue([
      { min_contracts: 1, max_contracts: 10, price_per_contract: 39.9 },
    ]);
    mockedCreateBilling.mockResolvedValue({ id: "b-new" });

    const { result } = renderHook(() => useCreateBilling(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      selectedCompany: "c-1",
      referenceMonth: "2025-06",
    });

    expect(mockedCreateBilling).toHaveBeenCalledWith(
      expect.objectContaining({ unit_price: 49.9 })
    );
  });
});

/* ------------------------------------------------------------------ */
/*  useMarkBillingAsPaid                                              */
/* ------------------------------------------------------------------ */

describe("useMarkBillingAsPaid", () => {
  it("calls markBillingAsPaid service", async () => {
    mockedMarkBillingAsPaid.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMarkBillingAsPaid(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      billingId: "b-1",
      paymentMethod: "pix",
    });

    expect(mockedMarkBillingAsPaid).toHaveBeenCalledWith("b-1", "pix");
  });
});

/* ------------------------------------------------------------------ */
/*  useCancelBilling                                                  */
/* ------------------------------------------------------------------ */

describe("useCancelBilling", () => {
  it("calls cancelBilling service", async () => {
    mockedCancelBilling.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCancelBilling(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("b-1");

    expect(mockedCancelBilling).toHaveBeenCalledWith("b-1");
  });
});
