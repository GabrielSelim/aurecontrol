import { describe, it, expect, vi, beforeEach } from "vitest";

const { queryMock, functionsMock } = vi.hoisted(() => {
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
  return { queryMock: qm, functionsMock: { invoke: vi.fn() } };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryMock),
    functions: functionsMock,
  },
}));

import {
  sendEmail,
  validateCnpj,
  sendUrgentAnnouncement,
} from "./edgeFunctionService";

beforeEach(() => {
  vi.clearAllMocks();
  functionsMock.invoke.mockResolvedValue({ data: null, error: null });
});

describe("sendEmail", () => {
  it("invokes send-email function", async () => {
    await sendEmail({ to: "a@b.com", subject: "Test", html: "<p>hi</p>" });
    expect(functionsMock.invoke).toHaveBeenCalledWith("send-email", {
      body: { to: "a@b.com", subject: "Test", html: "<p>hi</p>" },
    });
  });

  it("throws on error", async () => {
    const err = new Error("send fail");
    functionsMock.invoke.mockResolvedValue({ data: null, error: err });
    await expect(sendEmail({ to: "a@b.com", subject: "", html: "" })).rejects.toBe(err);
  });
});

describe("validateCnpj", () => {
  it("returns validation data on success", async () => {
    const data = { valid: true, cnpj: "12345678000199", razao_social: "Empresa LTDA" };
    functionsMock.invoke.mockResolvedValue({ data, error: null });

    const result = await validateCnpj("12345678000199");
    expect(result).toEqual(data);
    expect(functionsMock.invoke).toHaveBeenCalledWith("validate-cnpj", {
      body: { cnpj: "12345678000199" },
    });
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    functionsMock.invoke.mockResolvedValue({ data: null, error: err });
    await expect(validateCnpj("invalid")).rejects.toBe(err);
  });
});

describe("sendUrgentAnnouncement", () => {
  it("invokes send-urgent-announcement function", async () => {
    await sendUrgentAnnouncement("ann-1");
    expect(functionsMock.invoke).toHaveBeenCalledWith("send-urgent-announcement", {
      body: { announcement_id: "ann-1" },
    });
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    functionsMock.invoke.mockResolvedValue({ data: null, error: err });
    await expect(sendUrgentAnnouncement("ann-1")).rejects.toBe(err);
  });
});
