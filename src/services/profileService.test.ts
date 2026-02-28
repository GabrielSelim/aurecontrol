import { describe, it, expect, vi, beforeEach } from "vitest";

const { queryMock, storageMock } = vi.hoisted(() => {
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

  const sm = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/avatars/pic.png" } }),
  };
  return { queryMock: qm, storageMock: sm };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryMock),
    storage: { from: vi.fn(() => storageMock) },
  },
}));

import {
  fetchProfile,
  updateProfile,
  updateProfileById,
  fetchProfileByUserId,
  fetchProfileByEmail,
  countProfilesByCompany,
  fetchUserRoles,
  fetchUserRolesByUserIds,
  fetchUserIdsByRole,
  deleteUserRoles,
  insertUserRole,
  fetchProfilesByCompany,
  fetchProfileByUserIdMaybe,
  fetchProfilesByUserIds,
  countActiveProfilesByCompany,
  uploadAvatar,
} from "./profileService";

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
  storageMock.upload.mockResolvedValue({ error: null });
});

describe("fetchProfile", () => {
  it("returns profile on success", async () => {
    const profile = { id: "p1", full_name: "João" };
    queryMock.single.mockResolvedValue({ data: profile, error: null });
    expect(await fetchProfile("p1", "c1")).toEqual(profile);
  });

  it("throws on error", async () => {
    const err = new Error("not found");
    queryMock.single.mockResolvedValue({ data: null, error: err });
    await expect(fetchProfile("p1", "c1")).rejects.toBe(err);
  });
});

describe("updateProfile", () => {
  it("succeeds", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(updateProfile("u1", { full_name: "New" })).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const err = new Error("update fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(updateProfile("u1", {})).rejects.toBe(err);
  });
});

describe("updateProfileById", () => {
  it("updates by profile id", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(updateProfileById("p1", { email: "new@test.com" })).resolves.toBeUndefined();
  });
});

describe("fetchProfileByUserId", () => {
  it("returns full_name and email", async () => {
    const data = { full_name: "Ana", email: "ana@test.com" };
    queryMock.single.mockResolvedValue({ data, error: null });
    expect(await fetchProfileByUserId("u1")).toEqual(data);
  });
});

describe("fetchProfileByEmail", () => {
  it("returns profile or null", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchProfileByEmail("x@y.com", "c1")).toBeNull();
  });

  it("returns profile when found", async () => {
    const profile = { full_name: "João", cpf: "123" };
    queryMock.maybeSingle.mockResolvedValue({ data: profile, error: null });
    expect(await fetchProfileByEmail("joao@test.com", "c1")).toEqual(profile);
  });
});

describe("countProfilesByCompany", () => {
  it("returns count", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 15, error: null })
    );
    expect(await countProfilesByCompany("c1")).toBe(15);
  });

  it("returns 0 on null count", async () => {
    expect(await countProfilesByCompany("c1")).toBe(0);
  });
});

describe("fetchUserRoles", () => {
  it("returns user roles", async () => {
    const roles = [{ role: "admin" }, { role: "gestor" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: roles, error: null })
    );
    expect(await fetchUserRoles("u1")).toEqual(roles);
  });
});

describe("fetchUserRolesByUserIds", () => {
  it("returns roles for multiple users", async () => {
    const roles = [{ user_id: "u1", role: "admin" }, { user_id: "u2", role: "colaborador" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: roles, error: null })
    );
    expect(await fetchUserRolesByUserIds(["u1", "u2"])).toEqual(roles);
  });

  it("returns empty array on null", async () => {
    expect(await fetchUserRolesByUserIds(["u1"])).toEqual([]);
  });
});

describe("fetchUserIdsByRole", () => {
  it("extracts user_ids from result", async () => {
    const data = [{ user_id: "u1" }, { user_id: "u2" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data, error: null })
    );
    expect(await fetchUserIdsByRole("admin")).toEqual(["u1", "u2"]);
  });

  it("returns empty array on null data", async () => {
    expect(await fetchUserIdsByRole("admin")).toEqual([]);
  });
});

describe("deleteUserRoles", () => {
  it("deletes non-master_admin roles", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(deleteUserRoles("u1")).resolves.toBeUndefined();
    expect(queryMock.neq).toHaveBeenCalledWith("role", "master_admin");
  });
});

describe("insertUserRole", () => {
  it("inserts role", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(insertUserRole("u1", "gestor")).resolves.toBeUndefined();
  });
});

describe("fetchProfilesByCompany", () => {
  it("returns profiles for company", async () => {
    const profiles = [{ id: "p1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: profiles, error: null })
    );
    expect(await fetchProfilesByCompany("c1")).toEqual(profiles);
  });

  it("returns empty array on null", async () => {
    expect(await fetchProfilesByCompany("c1")).toEqual([]);
  });
});

describe("fetchProfileByUserIdMaybe", () => {
  it("returns profile or null", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchProfileByUserIdMaybe("u1")).toBeNull();
  });
});

describe("fetchProfilesByUserIds", () => {
  it("returns profiles for IDs", async () => {
    const profiles = [{ id: "p1" }, { id: "p2" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: profiles, error: null })
    );
    expect(await fetchProfilesByUserIds(["u1", "u2"])).toEqual(profiles);
  });
});

describe("countActiveProfilesByCompany", () => {
  it("returns active count", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 8, error: null })
    );
    expect(await countActiveProfilesByCompany("c1")).toBe(8);
  });
});

describe("uploadAvatar", () => {
  it("returns public URL on success", async () => {
    const result = await uploadAvatar("pic.png", new File([""], "pic.png"));
    expect(result).toBe("https://cdn.test/avatars/pic.png");
  });

  it("throws on upload error", async () => {
    const err = new Error("upload fail");
    storageMock.upload.mockResolvedValue({ error: err });
    await expect(uploadAvatar("pic.png", new File([""], "pic.png"))).rejects.toBe(err);
  });
});
