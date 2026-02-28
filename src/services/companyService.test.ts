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
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/logos/logo.png" } }),
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
  fetchCompany,
  fetchCompanyFull,
  fetchAllCompanies,
  fetchActiveCompanies,
  fetchCompaniesByIds,
  updateCompany,
  uploadCompanyLogo,
  countAllCompanies,
  countActiveCompanies,
  fetchRecentCompanies,
  fetchCompanyName,
  fetchCompanyMaybe,
} from "./companyService";

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
  storageMock.upload.mockResolvedValue({ error: null });
});

describe("fetchCompany", () => {
  it("returns company data on success", async () => {
    const company = { name: "Corp", cnpj: "123" };
    queryMock.single.mockResolvedValue({ data: company, error: null });

    const result = await fetchCompany("c1");
    expect(result).toEqual(company);
  });

  it("throws on error", async () => {
    const err = new Error("not found");
    queryMock.single.mockResolvedValue({ data: null, error: err });
    await expect(fetchCompany("c1")).rejects.toBe(err);
  });
});

describe("fetchCompanyFull", () => {
  it("returns full company data", async () => {
    const company = { id: "c1", name: "Corp", cnpj: "123", is_active: true };
    queryMock.single.mockResolvedValue({ data: company, error: null });
    expect(await fetchCompanyFull("c1")).toEqual(company);
  });
});

describe("fetchAllCompanies", () => {
  it("returns ordered list of companies", async () => {
    const companies = [{ id: "1" }, { id: "2" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: companies, error: null })
    );
    expect(await fetchAllCompanies()).toEqual(companies);
  });

  it("returns empty array when data is null", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    expect(await fetchAllCompanies()).toEqual([]);
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchAllCompanies()).rejects.toBe(err);
  });
});

describe("fetchActiveCompanies", () => {
  it("returns active companies", async () => {
    const active = [{ id: "1", name: "A", cnpj: "111" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: active, error: null })
    );
    expect(await fetchActiveCompanies()).toEqual(active);
  });
});

describe("fetchCompaniesByIds", () => {
  it("returns companies matching IDs", async () => {
    const companies = [{ id: "1" }, { id: "2" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: companies, error: null })
    );
    expect(await fetchCompaniesByIds(["1", "2"])).toEqual(companies);
  });
});

describe("updateCompany", () => {
  it("succeeds without error", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(updateCompany("c1", { name: "New" })).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const err = new Error("update fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(updateCompany("c1", {})).rejects.toBe(err);
  });
});

describe("uploadCompanyLogo", () => {
  it("returns public URL on success", async () => {
    const result = await uploadCompanyLogo("logo.png", new File([""], "logo.png"));
    expect(result).toBe("https://cdn.test/logos/logo.png");
  });

  it("throws on upload error", async () => {
    const err = new Error("upload fail");
    storageMock.upload.mockResolvedValue({ error: err });
    await expect(uploadCompanyLogo("logo.png", new File([""], "logo.png"))).rejects.toBe(err);
  });
});

describe("countAllCompanies", () => {
  it("returns count", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 42, error: null })
    );
    expect(await countAllCompanies()).toBe(42);
  });

  it("returns 0 when count is null", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: null, error: null })
    );
    expect(await countAllCompanies()).toBe(0);
  });
});

describe("countActiveCompanies", () => {
  it("returns count of active companies", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 10, error: null })
    );
    expect(await countActiveCompanies()).toBe(10);
  });
});

describe("fetchRecentCompanies", () => {
  it("returns recent companies", async () => {
    const recent = [{ id: "1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: recent, error: null })
    );
    expect(await fetchRecentCompanies()).toEqual(recent);
  });

  it("returns empty array on null data", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    expect(await fetchRecentCompanies(10)).toEqual([]);
  });
});

describe("fetchCompanyName", () => {
  it("returns company name", async () => {
    queryMock.single.mockResolvedValue({ data: { name: "My Corp" }, error: null });
    expect(await fetchCompanyName("c1")).toBe("My Corp");
  });

  it("returns null when data has no name", async () => {
    queryMock.single.mockResolvedValue({ data: null, error: null });
    expect(await fetchCompanyName("c1")).toBeNull();
  });
});

describe("fetchCompanyMaybe", () => {
  it("returns company or null", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchCompanyMaybe("c1")).toBeNull();
  });

  it("returns company data when found", async () => {
    const company = { id: "c1", name: "Corp" };
    queryMock.maybeSingle.mockResolvedValue({ data: company, error: null });
    expect(await fetchCompanyMaybe("c1")).toEqual(company);
  });
});
