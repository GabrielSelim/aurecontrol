import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Mock services                                                     */
/* ------------------------------------------------------------------ */
vi.mock("@/services/companyService", () => ({
  fetchActiveCompanies: vi.fn(),
  fetchCompany: vi.fn(),
  fetchAllCompanies: vi.fn(),
  fetchRecentCompanies: vi.fn(),
  countAllCompanies: vi.fn(),
  countActiveCompanies: vi.fn(),
}));

vi.mock("@/services/profileService", () => ({
  countProfilesByCompany: vi.fn(),
}));

vi.mock("@/services/contractService", () => ({
  countContractsByCompany: vi.fn(),
  countAllActivePJContracts: vi.fn(),
}));

import {
  fetchActiveCompanies,
  fetchCompany,
  fetchAllCompanies,
  fetchRecentCompanies,
  countAllCompanies,
  countActiveCompanies,
} from "@/services/companyService";
import { countProfilesByCompany } from "@/services/profileService";
import {
  countContractsByCompany,
  countAllActivePJContracts,
} from "@/services/contractService";

import {
  useActiveCompanies,
  useCompany,
  useAllCompaniesWithCounts,
  useMasterAdminOverview,
} from "./useCompanyQueries";

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
  fetchActiveCompanies: fetchActiveCompanies as ReturnType<typeof vi.fn>,
  fetchCompany: fetchCompany as ReturnType<typeof vi.fn>,
  fetchAllCompanies: fetchAllCompanies as ReturnType<typeof vi.fn>,
  fetchRecentCompanies: fetchRecentCompanies as ReturnType<typeof vi.fn>,
  countAllCompanies: countAllCompanies as ReturnType<typeof vi.fn>,
  countActiveCompanies: countActiveCompanies as ReturnType<typeof vi.fn>,
  countProfilesByCompany: countProfilesByCompany as ReturnType<typeof vi.fn>,
  countContractsByCompany: countContractsByCompany as ReturnType<typeof vi.fn>,
  countAllActivePJContracts: countAllActivePJContracts as ReturnType<typeof vi.fn>,
};

beforeEach(() => vi.clearAllMocks());

/* ------------------------------------------------------------------ */
/*  useActiveCompanies                                                */
/* ------------------------------------------------------------------ */

describe("useActiveCompanies", () => {
  it("fetches active companies", async () => {
    const companies = [{ id: "c-1", name: "Corp" }];
    m.fetchActiveCompanies.mockResolvedValue(companies);

    const { result } = renderHook(() => useActiveCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(companies);
  });
});

/* ------------------------------------------------------------------ */
/*  useCompany                                                        */
/* ------------------------------------------------------------------ */

describe("useCompany", () => {
  it("is disabled when companyId is undefined", () => {
    const { result } = renderHook(() => useCompany(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(m.fetchCompany).not.toHaveBeenCalled();
  });

  it("fetches company by id", async () => {
    const company = { id: "c-1", name: "Corp", cnpj: "123" };
    m.fetchCompany.mockResolvedValue(company);

    const { result } = renderHook(() => useCompany("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(company);
    expect(m.fetchCompany).toHaveBeenCalledWith("c-1");
  });
});

/* ------------------------------------------------------------------ */
/*  useAllCompaniesWithCounts                                         */
/* ------------------------------------------------------------------ */

describe("useAllCompaniesWithCounts", () => {
  it("returns empty array when no companies", async () => {
    m.fetchAllCompanies.mockResolvedValue(null);

    const { result } = renderHook(() => useAllCompaniesWithCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("enriches companies with user and contract counts", async () => {
    m.fetchAllCompanies.mockResolvedValue([
      { id: "c-1", name: "Corp", cnpj: "123", email: null, phone: null, is_active: true, created_at: "2025-01-01" },
    ]);
    m.countProfilesByCompany.mockResolvedValue(5);
    // countContractsByCompany is called twice per company: once with "PJ" and once without
    m.countContractsByCompany.mockImplementation(
      (_cid: string, type?: string) => (type === "PJ" ? Promise.resolve(3) : Promise.resolve(7))
    );

    const { result } = renderHook(() => useAllCompaniesWithCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const company = result.current.data![0];
    expect(company._count.users).toBe(5);
    expect(company._count.pjContracts).toBe(3);
    expect(company._count.otherContracts).toBe(4); // 7 - 3
  });
});

/* ------------------------------------------------------------------ */
/*  useMasterAdminOverview                                            */
/* ------------------------------------------------------------------ */

describe("useMasterAdminOverview", () => {
  it("returns global stats and recent companies with counts", async () => {
    m.countAllCompanies.mockResolvedValue(10);
    m.countActiveCompanies.mockResolvedValue(8);
    m.countAllActivePJContracts.mockResolvedValue(50);

    m.fetchRecentCompanies.mockResolvedValue([
      { id: "c-1", name: "Corp", cnpj: "123", email: null, is_active: true, created_at: "2025-01-01" },
    ]);
    m.countProfilesByCompany.mockResolvedValue(3);
    m.countContractsByCompany.mockResolvedValue(2);

    const { result } = renderHook(() => useMasterAdminOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.stats.totalCompanies).toBe(10);
    expect(data.stats.activeCompanies).toBe(8);
    expect(data.stats.totalPJContracts).toBe(50);
    expect(data.stats.estimatedRevenue).toBe(50 * 49.9);

    expect(data.companies).toHaveLength(1);
    expect(data.companies[0]._count.users).toBe(3);
    expect(data.companies[0]._count.pjContracts).toBe(2);
  });

  it("handles empty recent companies", async () => {
    m.countAllCompanies.mockResolvedValue(0);
    m.countActiveCompanies.mockResolvedValue(0);
    m.countAllActivePJContracts.mockResolvedValue(0);
    m.fetchRecentCompanies.mockResolvedValue([]);

    const { result } = renderHook(() => useMasterAdminOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.companies).toEqual([]);
    expect(result.current.data!.stats.estimatedRevenue).toBe(0);
  });
});
