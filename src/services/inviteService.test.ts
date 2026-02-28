import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted so these are available inside the hoisted vi.mock factory
const { queryMock, rpcMock } = vi.hoisted(() => {
  const qm: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "gte", "lte", "lt", "gt",
    "order", "limit", "range", "filter",
  ];
  for (const method of chainMethods) {
    qm[method] = vi.fn().mockReturnValue(qm);
  }
  qm.single = vi.fn().mockResolvedValue({ data: null, error: null });
  qm.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  qm.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
  return { queryMock: qm, rpcMock: vi.fn() };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryMock),
    rpc: rpcMock,
  },
}));

import {
  fetchInvitesByCompany,
  checkDuplicateInvite,
  createInvite,
  updateInviteStatus,
  extendInviteExpiry,
  renewExpiredInvite,
  getInviteByToken,
} from "./inviteService";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset terminal methods to success by default
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
});

describe("fetchInvitesByCompany", () => {
  it("returns invites on success", async () => {
    const invites = [{ id: "1", email: "a@b.com" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: invites, error: null })
    );

    const result = await fetchInvitesByCompany("comp-1");
    expect(result).toEqual(invites);
  });

  it("returns empty array when data is null", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );

    const result = await fetchInvitesByCompany("comp-1");
    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    const err = new Error("db error");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );

    await expect(fetchInvitesByCompany("comp-1")).rejects.toBe(err);
  });
});

describe("checkDuplicateInvite", () => {
  it("returns null when no duplicate exists", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await checkDuplicateInvite("a@b.com", "comp-1");
    expect(result).toBeNull();
  });

  it("returns data when duplicate found", async () => {
    const dup = { id: "inv-1" };
    queryMock.maybeSingle.mockResolvedValue({ data: dup, error: null });
    const result = await checkDuplicateInvite("a@b.com", "comp-1");
    expect(result).toEqual(dup);
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: err });
    await expect(checkDuplicateInvite("a@b.com", "comp-1")).rejects.toBe(err);
  });
});

describe("createInvite", () => {
  it("returns created invite on success", async () => {
    const invite = { id: "new-1", email: "test@b.com", role: "admin" };
    queryMock.single.mockResolvedValue({ data: invite, error: null });

    const result = await createInvite({
      email: "test@b.com",
      role: "admin",
      company_id: "comp-1",
      invited_by: "user-1",
    });
    expect(result).toEqual(invite);
  });

  it("throws on error", async () => {
    const err = new Error("insert failed");
    queryMock.single.mockResolvedValue({ data: null, error: err });

    await expect(
      createInvite({ email: "x@y.com", role: "admin", company_id: "c1", invited_by: "u1" })
    ).rejects.toBe(err);
  });
});

describe("updateInviteStatus", () => {
  it("succeeds without extra fields", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(updateInviteStatus("inv-1", "accepted")).resolves.toBeUndefined();
  });

  it("succeeds with extra fields", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(
      updateInviteStatus("inv-1", "accepted", { accepted_at: "2025-01-01" })
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const err = new Error("update fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(updateInviteStatus("inv-1", "accepted")).rejects.toBe(err);
  });
});

describe("extendInviteExpiry", () => {
  it("succeeds", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(extendInviteExpiry("inv-1", "2025-12-31")).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(extendInviteExpiry("inv-1", "2025-12-31")).rejects.toBe(err);
  });
});

describe("renewExpiredInvite", () => {
  it("succeeds", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(renewExpiredInvite("inv-1", "2025-12-31")).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(renewExpiredInvite("inv-1", "2025-12-31")).rejects.toBe(err);
  });
});

describe("getInviteByToken", () => {
  it("returns invite data from RPC", async () => {
    const invite = { id: "inv-1", token: "abc" };
    rpcMock.mockResolvedValue({ data: invite, error: null });

    const result = await getInviteByToken("abc");
    expect(result).toEqual(invite);
    expect(rpcMock).toHaveBeenCalledWith("get_invite_by_token", { _token: "abc" });
  });

  it("throws on RPC error", async () => {
    const err = new Error("rpc fail");
    rpcMock.mockResolvedValue({ data: null, error: err });
    await expect(getInviteByToken("bad")).rejects.toBe(err);
  });
});
