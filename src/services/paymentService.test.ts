import { describe, it, expect, vi, beforeEach } from "vitest";

const { queryMock } = vi.hoisted(() => {
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
  return { queryMock: qm };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryMock),
  },
}));

import {
  fetchPaymentsByCompany,
  createPayments,
  approvePayment,
  batchApprovePayments,
  rejectPayment,
  fetchContractSplits,
  fetchAllBillings,
  createBilling,
  markBillingAsPaid,
  cancelBilling,
  fetchPaymentsByUser,
  countPaymentsByUser,
  countPaymentsByCompany,
  fetchPaidPaymentsInRange,
  countPendingPayments,
  countOverduePayments,
  fetchDelinquentContractIds,
  fetchBillingsByCompany,
  countBillingsByCompany,
} from "./paymentService";

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
});

/* ------------------------------------------------------------------ */
/*  Payments CRUD                                                     */
/* ------------------------------------------------------------------ */

describe("fetchPaymentsByCompany", () => {
  it("returns payments", async () => {
    const payments = [{ id: "p1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: payments, error: null })
    );
    expect(await fetchPaymentsByCompany("c1")).toEqual(payments);
  });

  it("returns empty array on null", async () => {
    expect(await fetchPaymentsByCompany("c1")).toEqual([]);
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchPaymentsByCompany("c1")).rejects.toBe(err);
  });
});

describe("createPayments", () => {
  it("inserts batch payments", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(createPayments([{ amount: 100 }])).resolves.toBeUndefined();
    expect(queryMock.insert).toHaveBeenCalled();
  });

  it("throws on error", async () => {
    const err = new Error("insert fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(createPayments([{ amount: 100 }])).rejects.toBe(err);
  });
});

describe("approvePayment", () => {
  it("updates payment to paid status", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(approvePayment("p1", "admin-1", "2025-01-15")).resolves.toBeUndefined();
    expect(queryMock.update).toHaveBeenCalled();
  });

  it("throws on error", async () => {
    const err = new Error("approve fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(approvePayment("p1", "admin-1", "2025-01-15")).rejects.toBe(err);
  });
});

describe("batchApprovePayments", () => {
  it("batch updates payments to paid", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(
      batchApprovePayments(["p1", "p2"], "admin-1", "2025-01-15")
    ).resolves.toBeUndefined();
    expect(queryMock.in).toHaveBeenCalledWith("id", ["p1", "p2"]);
  });
});

describe("rejectPayment", () => {
  it("rejects payment", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(rejectPayment("p1")).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Contract Splits                                                   */
/* ------------------------------------------------------------------ */

describe("fetchContractSplits", () => {
  it("returns splits", async () => {
    const splits = [{ contract_id: "c1", percentage: 50 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: splits, error: null })
    );
    expect(await fetchContractSplits()).toEqual(splits);
  });
});

/* ------------------------------------------------------------------ */
/*  Billings                                                          */
/* ------------------------------------------------------------------ */

describe("fetchAllBillings", () => {
  it("returns all billings", async () => {
    const billings = [{ id: "b1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: billings, error: null })
    );
    expect(await fetchAllBillings()).toEqual(billings);
  });
});

describe("createBilling", () => {
  it("inserts billing", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(
      createBilling({
        company_id: "c1",
        reference_month: "2025-01-01",
        pj_contracts_count: 5,
        unit_price: 49.9,
        subtotal: 249.5,
        total: 249.5,
        due_date: "2025-02-10",
        status: "pending",
      })
    ).resolves.toBeUndefined();
  });
});

describe("markBillingAsPaid", () => {
  it("marks billing as paid", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(markBillingAsPaid("b1", "pix")).resolves.toBeUndefined();
  });
});

describe("cancelBilling", () => {
  it("cancels billing", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(cancelBilling("b1")).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Per-User Payments                                                 */
/* ------------------------------------------------------------------ */

describe("fetchPaymentsByUser", () => {
  it("returns user payments", async () => {
    const payments = [{ id: "p1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: payments, error: null })
    );
    expect(await fetchPaymentsByUser("u1")).toEqual(payments);
  });
});

describe("countPaymentsByUser", () => {
  it("returns count", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 3, error: null })
    );
    expect(await countPaymentsByUser("u1")).toBe(3);
  });

  it("returns 0 on null count", async () => {
    expect(await countPaymentsByUser("u1")).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Payment Counts & Aggregations                                     */
/* ------------------------------------------------------------------ */

describe("countPaymentsByCompany", () => {
  it("returns count without filters", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 20, error: null })
    );
    expect(await countPaymentsByCompany("c1")).toBe(20);
  });

  it("returns count with status filter", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 5, error: null })
    );
    expect(await countPaymentsByCompany("c1", { status: "paid" })).toBe(5);
  });
});

describe("fetchPaidPaymentsInRange", () => {
  it("returns paid payments in date range", async () => {
    const payments = [{ amount: 100 }, { amount: 200 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: payments, error: null })
    );
    expect(
      await fetchPaidPaymentsInRange({ fromDate: "2025-01-01", toDate: "2025-01-31" })
    ).toEqual(payments);
  });

  it("returns empty array on null data", async () => {
    expect(
      await fetchPaidPaymentsInRange({ fromDate: "2025-01-01", toDate: "2025-01-31" })
    ).toEqual([]);
  });
});

describe("countPendingPayments", () => {
  it("returns count without company filter", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 12, error: null })
    );
    expect(await countPendingPayments()).toBe(12);
  });

  it("returns count with company filter", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 3, error: null })
    );
    expect(await countPendingPayments("c1")).toBe(3);
  });
});

describe("countOverduePayments", () => {
  it("returns count without filters", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 4, error: null })
    );
    expect(await countOverduePayments()).toBe(4);
  });

  it("returns count with filters", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 2, error: null })
    );
    expect(
      await countOverduePayments({ companyId: "c1", beforeDate: "2025-01-01" })
    ).toBe(2);
  });
});

describe("fetchDelinquentContractIds", () => {
  it("returns delinquent contract IDs", async () => {
    const ids = [{ contract_id: "ct1" }, { contract_id: "ct2" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: ids, error: null })
    );
    expect(await fetchDelinquentContractIds("c1")).toEqual(ids);
  });
});

describe("fetchBillingsByCompany", () => {
  it("returns company billings", async () => {
    const billings = [{ id: "b1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: billings, error: null })
    );
    expect(await fetchBillingsByCompany("c1")).toEqual(billings);
  });
});

describe("countBillingsByCompany", () => {
  it("returns count", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ count: 6, error: null })
    );
    expect(await countBillingsByCompany("c1")).toBe(6);
  });
});
