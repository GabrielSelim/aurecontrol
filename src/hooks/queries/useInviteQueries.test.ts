import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Mock services                                                     */
/* ------------------------------------------------------------------ */
vi.mock("@/services/inviteService", () => ({
  fetchInvitesByCompany: vi.fn(),
  createInvite: vi.fn(),
  extendInviteExpiry: vi.fn(),
  renewExpiredInvite: vi.fn(),
  updateInviteStatus: vi.fn(),
}));

vi.mock("@/services/contractService", () => ({
  fetchActiveContractsByCompany: vi.fn(),
}));

vi.mock("@/services/profileService", () => ({
  fetchProfileByUserId: vi.fn(),
  fetchProfileByEmail: vi.fn(),
}));

import {
  fetchInvitesByCompany,
  createInvite,
  extendInviteExpiry,
  renewExpiredInvite,
  updateInviteStatus,
} from "@/services/inviteService";
import { fetchActiveContractsByCompany } from "@/services/contractService";
import { fetchProfileByUserId, fetchProfileByEmail } from "@/services/profileService";

import {
  useInvites,
  useAvailableContracts,
  useCreateInvite,
  useExtendInviteExpiry,
  useRenewExpiredInvite,
  useCancelInvite,
} from "./useInviteQueries";

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

const mockedFetchInvitesByCompany = fetchInvitesByCompany as ReturnType<typeof vi.fn>;
const mockedFetchProfileByEmail = fetchProfileByEmail as ReturnType<typeof vi.fn>;
const mockedFetchActiveContractsByCompany = fetchActiveContractsByCompany as ReturnType<typeof vi.fn>;
const mockedFetchProfileByUserId = fetchProfileByUserId as ReturnType<typeof vi.fn>;
const mockedCreateInvite = createInvite as ReturnType<typeof vi.fn>;
const mockedExtendInviteExpiry = extendInviteExpiry as ReturnType<typeof vi.fn>;
const mockedRenewExpiredInvite = renewExpiredInvite as ReturnType<typeof vi.fn>;
const mockedUpdateInviteStatus = updateInviteStatus as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  useInvites                                                        */
/* ------------------------------------------------------------------ */

describe("useInvites", () => {
  it("is disabled when companyId is undefined", () => {
    const { result } = renderHook(() => useInvites(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedFetchInvitesByCompany).not.toHaveBeenCalled();
  });

  it("returns pending invites without onboarding info", async () => {
    mockedFetchInvitesByCompany.mockResolvedValue([
      { id: "i-1", email: "a@b.com", status: "pending", company_id: "c-1" },
    ]);

    const { result } = renderHook(() => useInvites("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].onboarding).toBeUndefined();
  });

  it("enriches accepted invites with onboarding data", async () => {
    mockedFetchInvitesByCompany.mockResolvedValue([
      { id: "i-2", email: "user@co.com", status: "accepted", company_id: "c-1" },
    ]);
    mockedFetchProfileByEmail.mockResolvedValue({
      full_name: "User",
      cpf: "12345678901",
      phone: "11999999999",
      pj_cnpj: "12345678000100",
      pj_razao_social: "Corp",
      address_cep: "01001000",
      address_street: "Rua A",
      address_city: "SP",
    });

    const { result } = renderHook(() => useInvites("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invite = result.current.data![0];
    expect(invite.onboarding).toBeDefined();
    expect(invite.onboarding!.hasPersonalData).toBe(true);
    expect(invite.onboarding!.hasFiscalData).toBe(true);
    expect(invite.onboarding!.hasAddress).toBe(true);
    expect(invite.onboarding!.completionPercent).toBe(100);
  });

  it("returns partial onboarding when profile has missing data", async () => {
    mockedFetchInvitesByCompany.mockResolvedValue([
      { id: "i-3", email: "a@b.com", status: "accepted", company_id: "c-1" },
    ]);
    mockedFetchProfileByEmail.mockResolvedValue({
      full_name: "User",
      cpf: "12345678901",
      phone: "11999999999",
      pj_cnpj: null,
      pj_razao_social: null,
      address_cep: null,
      address_street: null,
      address_city: null,
    });

    const { result } = renderHook(() => useInvites("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invite = result.current.data![0];
    expect(invite.onboarding!.hasPersonalData).toBe(true);
    expect(invite.onboarding!.hasFiscalData).toBe(false);
    expect(invite.onboarding!.hasAddress).toBe(false);
    expect(invite.onboarding!.completionPercent).toBe(50); // password + personal only
  });

  it("returns accepted invite without onboarding when profile not found", async () => {
    mockedFetchInvitesByCompany.mockResolvedValue([
      { id: "i-4", email: "a@b.com", status: "accepted", company_id: "c-1" },
    ]);
    mockedFetchProfileByEmail.mockResolvedValue(null);

    const { result } = renderHook(() => useInvites("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0].onboarding).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  useAvailableContracts                                             */
/* ------------------------------------------------------------------ */

describe("useAvailableContracts", () => {
  it("is disabled when companyId is undefined", () => {
    const { result } = renderHook(() => useAvailableContracts(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches contracts with profile names", async () => {
    mockedFetchActiveContractsByCompany.mockResolvedValue([
      { id: "ct-1", user_id: "u-1", job_title: "Dev" },
      { id: "ct-2", user_id: "u-2", job_title: "QA" },
    ]);
    mockedFetchProfileByUserId.mockImplementation((uid: string) => {
      if (uid === "u-1") return Promise.resolve({ full_name: "Alice" });
      return Promise.resolve({ full_name: "Bob" });
    });

    const { result } = renderHook(() => useAvailableContracts("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: "ct-1", job_title: "Dev", profile_name: "Alice" },
      { id: "ct-2", job_title: "QA", profile_name: "Bob" },
    ]);
  });

  it("handles missing profile gracefully", async () => {
    mockedFetchActiveContractsByCompany.mockResolvedValue([
      { id: "ct-3", user_id: "u-3", job_title: "PM" },
    ]);
    mockedFetchProfileByUserId.mockRejectedValue(new Error("not found"));

    const { result } = renderHook(() => useAvailableContracts("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0].profile_name).toBe("");
  });
});

/* ------------------------------------------------------------------ */
/*  useCreateInvite                                                   */
/* ------------------------------------------------------------------ */

describe("useCreateInvite", () => {
  it("calls createInvite and invalidates cache", async () => {
    mockedCreateInvite.mockResolvedValue({ id: "i-new" });

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      email: "user@test.com",
      role: "colaborador",
      company_id: "c-1",
      invited_by: "u-admin",
    });

    expect(mockedCreateInvite).toHaveBeenCalledWith({
      email: "user@test.com",
      role: "colaborador",
      company_id: "c-1",
      invited_by: "u-admin",
    });
  });
});

/* ------------------------------------------------------------------ */
/*  useExtendInviteExpiry                                             */
/* ------------------------------------------------------------------ */

describe("useExtendInviteExpiry", () => {
  it("extends expiry with correct params", async () => {
    mockedExtendInviteExpiry.mockResolvedValue(undefined);

    const { result } = renderHook(() => useExtendInviteExpiry(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      inviteId: "i-1",
      newExpiresAt: "2025-12-31",
      companyId: "c-1",
    });

    expect(mockedExtendInviteExpiry).toHaveBeenCalledWith("i-1", "2025-12-31");
  });
});

/* ------------------------------------------------------------------ */
/*  useRenewExpiredInvite                                             */
/* ------------------------------------------------------------------ */

describe("useRenewExpiredInvite", () => {
  it("renews expired invite", async () => {
    mockedRenewExpiredInvite.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRenewExpiredInvite(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      inviteId: "i-2",
      newExpiresAt: "2025-12-31",
      companyId: "c-1",
    });

    expect(mockedRenewExpiredInvite).toHaveBeenCalledWith("i-2", "2025-12-31");
  });
});

/* ------------------------------------------------------------------ */
/*  useCancelInvite                                                   */
/* ------------------------------------------------------------------ */

describe("useCancelInvite", () => {
  it("cancels invite via updateInviteStatus", async () => {
    mockedUpdateInviteStatus.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCancelInvite(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      inviteId: "i-3",
      companyId: "c-1",
    });

    expect(mockedUpdateInviteStatus).toHaveBeenCalledWith("i-3", "cancelled");
  });
});
