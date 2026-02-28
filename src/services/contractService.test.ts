import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Supabase mock (vi.hoisted pattern)                                */
/* ------------------------------------------------------------------ */
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
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/sig.png" } }),
  };

  return { queryMock: qm, storageMock: sm };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryMock),
    storage: {
      from: vi.fn(() => storageMock),
      listBuckets: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  fetchActiveTemplates,
  createTemplate,
  updateTemplate,
  softDeleteTemplate,
  duplicateTemplate,
  fetchTemplateVersions,
  getLatestVersionNumber,
  createTemplateVersion,
  fetchTemplateUsageCounts,
  fetchContract,
  fetchContractsByCompany,
  fetchActiveContractsByCompany,
  updateContractStatus,
  countContractsByCompany,
  countActivePJContracts,
  countAllActivePJContracts,
  fetchContractsByUser,
  createContract,
  createDocument,
  createSignatures,
  createContractSplits,
  fetchDocumentHtml,
  fetchContractsByIds,
  fetchContractDocumentById,
  fetchExpiringContracts,
  fetchContractUserIds,
  fetchContractSalaries,
  fetchActiveTemplatesByCompany,
  fetchPendingSignaturesByEmail,
  fetchContractDocument,
  fetchCompletedDocuments,
  updateDocumentStatus,
  fetchSignaturesByDocument,
  fetchSignatureByToken,
  updateSignature,
  recordSignature,
  fetchSignatureToken,
  updateSignaturePositions,
  checkAllSignaturesCompleted,
  uploadSignatureImage,
  checkSignatureStorageAvailable,
} from "./contractService";

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
  storageMock.upload.mockResolvedValue({ error: null });
});

/* ================================================================== */
/*  Contract Templates                                                */
/* ================================================================== */

describe("fetchActiveTemplates", () => {
  it("returns templates on success", async () => {
    const templates = [{ id: "t-1", name: "PJ Default" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: templates, error: null })
    );
    const result = await fetchActiveTemplates("c-1");
    expect(result).toEqual(templates);
  });

  it("returns empty array when data is null", async () => {
    const result = await fetchActiveTemplates();
    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    const err = new Error("db");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchActiveTemplates()).rejects.toBe(err);
  });
});

describe("createTemplate", () => {
  it("calls insert with template data", async () => {
    const tpl = {
      company_id: "c-1",
      name: "T",
      description: null,
      content: "<p>hi</p>",
      default_witness_count: 2,
      is_system_default: false,
      created_by: "u-1",
      category: null,
    };
    await createTemplate(tpl);
    expect(queryMock.insert).toHaveBeenCalledWith(tpl);
  });

  it("throws on error", async () => {
    const err = new Error("insert fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(
      createTemplate({
        company_id: "c-1",
        name: "T",
        description: null,
        content: "",
        default_witness_count: 2,
        is_system_default: false,
        created_by: null,
        category: null,
      })
    ).rejects.toBe(err);
  });
});

describe("updateTemplate", () => {
  it("calls update then eq", async () => {
    await updateTemplate("t-1", { name: "New" });
    expect(queryMock.update).toHaveBeenCalledWith({ name: "New" });
    expect(queryMock.eq).toHaveBeenCalledWith("id", "t-1");
  });
});

describe("softDeleteTemplate", () => {
  it("sets is_active false", async () => {
    await softDeleteTemplate("t-1");
    expect(queryMock.update).toHaveBeenCalledWith({ is_active: false });
    expect(queryMock.eq).toHaveBeenCalledWith("id", "t-1");
  });
});

describe("duplicateTemplate", () => {
  it("inserts with is_system_default false", async () => {
    await duplicateTemplate({
      company_id: "c-1",
      name: "Copy",
      description: null,
      content: "",
      default_witness_count: 0,
      category: null,
      created_by: null,
    });
    expect(queryMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_system_default: false, name: "Copy" })
    );
  });
});

/* ================================================================== */
/*  Template Versions                                                 */
/* ================================================================== */

describe("fetchTemplateVersions", () => {
  it("returns versions on success", async () => {
    const versions = [{ id: "v-1", version_number: 1 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: versions, error: null })
    );
    const result = await fetchTemplateVersions("t-1");
    expect(result).toEqual(versions);
  });
});

describe("getLatestVersionNumber", () => {
  it("returns version_number from data", async () => {
    queryMock.maybeSingle.mockResolvedValue({
      data: { version_number: 3 },
      error: null,
    });
    const result = await getLatestVersionNumber("t-1");
    expect(result).toBe(3);
  });

  it("returns 0 when no versions exist", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await getLatestVersionNumber("t-1");
    expect(result).toBe(0);
  });
});

describe("createTemplateVersion", () => {
  it("calls insert with version data", async () => {
    const v = {
      template_id: "t-1",
      version_number: 2,
      name: "v2",
      description: null,
      content: "<p>v2</p>",
      saved_by: "u-1",
    };
    await createTemplateVersion(v);
    expect(queryMock.insert).toHaveBeenCalledWith(v);
  });
});

/* ================================================================== */
/*  Contracts                                                         */
/* ================================================================== */

describe("fetchContract", () => {
  it("returns contract on success", async () => {
    const contract = { id: "ct-1", job_title: "Dev" };
    queryMock.maybeSingle.mockResolvedValue({ data: contract, error: null });
    const result = await fetchContract("ct-1");
    expect(result).toEqual(contract);
  });
});

describe("fetchContractsByCompany", () => {
  it("returns contracts on success", async () => {
    const contracts = [{ id: "ct-1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: contracts, error: null })
    );
    const result = await fetchContractsByCompany("c-1");
    expect(result).toEqual(contracts);
  });

  it("applies status filter when provided", async () => {
    await fetchContractsByCompany("c-1", { status: "active" });
    // eq is called for company_id and status
    expect(queryMock.eq).toHaveBeenCalledWith("status", "active");
  });

  it("applies contract_type filter when provided", async () => {
    await fetchContractsByCompany("c-1", { contract_type: "PJ" });
    expect(queryMock.eq).toHaveBeenCalledWith("contract_type", "PJ");
  });
});

describe("fetchActiveContractsByCompany", () => {
  it("returns active contracts", async () => {
    const contracts = [{ id: "ct-1", job_title: "Dev", user_id: "u-1", salary: 5000 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: contracts, error: null })
    );
    const result = await fetchActiveContractsByCompany("c-1");
    expect(result).toEqual(contracts);
  });
});

describe("updateContractStatus", () => {
  it("updates status", async () => {
    await updateContractStatus("ct-1", "cancelled");
    expect(queryMock.update).toHaveBeenCalledWith({ status: "cancelled" });
    expect(queryMock.eq).toHaveBeenCalledWith("id", "ct-1");
  });
});

describe("countContractsByCompany", () => {
  it("returns count on success", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null, count: 5 })
    );
    const result = await countContractsByCompany("c-1");
    expect(result).toBe(5);
  });

  it("returns 0 when count is null", async () => {
    const result = await countContractsByCompany("c-1");
    expect(result).toBe(0);
  });

  it("applies contractType filter", async () => {
    await countContractsByCompany("c-1", "PJ");
    expect(queryMock.eq).toHaveBeenCalledWith("contract_type", "PJ");
  });
});

describe("countActivePJContracts", () => {
  it("returns count of active PJ contracts", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null, count: 10 })
    );
    const result = await countActivePJContracts("c-1");
    expect(result).toBe(10);
  });
});

describe("countAllActivePJContracts", () => {
  it("returns global PJ contract count", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null, count: 42 })
    );
    const result = await countAllActivePJContracts();
    expect(result).toBe(42);
  });
});

describe("fetchContractsByUser", () => {
  it("returns user contracts", async () => {
    const contracts = [{ id: "ct-1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: contracts, error: null })
    );
    const result = await fetchContractsByUser("u-1");
    expect(result).toEqual(contracts);
  });
});

describe("createContract", () => {
  it("inserts and returns new contract", async () => {
    const newContract = { id: "ct-new", job_title: "Dev" };
    queryMock.single.mockResolvedValue({ data: newContract, error: null });
    const result = await createContract({ job_title: "Dev" });
    expect(result).toEqual(newContract);
  });

  it("throws on error", async () => {
    const err = new Error("constraint");
    queryMock.single.mockResolvedValue({ data: null, error: err });
    await expect(createContract({})).rejects.toBe(err);
  });
});

describe("createDocument", () => {
  it("inserts and returns new document", async () => {
    const doc = { id: "doc-1" };
    queryMock.single.mockResolvedValue({ data: doc, error: null });
    const result = await createDocument({ contract_id: "ct-1" });
    expect(result).toEqual(doc);
  });
});

describe("createSignatures", () => {
  it("calls insert with entries", async () => {
    const entries = [{ signer_name: "A" }, { signer_name: "B" }];
    await createSignatures(entries);
    expect(queryMock.insert).toHaveBeenCalledWith(entries);
  });
});

describe("createContractSplits", () => {
  it("calls insert with splits", async () => {
    const splits = [{ contract_id: "ct-1", percentage: 50 }];
    await createContractSplits(splits);
    expect(queryMock.insert).toHaveBeenCalledWith(splits);
  });
});

describe("fetchDocumentHtml", () => {
  it("returns html content", async () => {
    queryMock.single.mockResolvedValue({
      data: { document_html: "<p>HTML</p>" },
      error: null,
    });
    const result = await fetchDocumentHtml("ct-1");
    expect(result).toBe("<p>HTML</p>");
  });

  it("returns null when no html", async () => {
    queryMock.single.mockResolvedValue({ data: null, error: null });
    const result = await fetchDocumentHtml("ct-1");
    expect(result).toBeNull();
  });
});

describe("fetchContractsByIds", () => {
  it("returns contracts matching ids", async () => {
    const contracts = [{ id: "ct-1" }, { id: "ct-2" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: contracts, error: null })
    );
    const result = await fetchContractsByIds(["ct-1", "ct-2"]);
    expect(result).toEqual(contracts);
  });

  it("applies optional filters", async () => {
    await fetchContractsByIds(["ct-1"], { contract_type: "PJ", status: "active" });
    expect(queryMock.eq).toHaveBeenCalledWith("contract_type", "PJ");
    expect(queryMock.eq).toHaveBeenCalledWith("status", "active");
  });
});

describe("fetchExpiringContracts", () => {
  it("returns expiring contracts in range", async () => {
    const contracts = [{ id: "ct-1", end_date: "2025-06-01" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: contracts, error: null })
    );
    const result = await fetchExpiringContracts("c-1", "2025-05-01", "2025-06-30");
    expect(result).toEqual(contracts);
  });
});

describe("fetchContractUserIds", () => {
  it("returns user_ids", async () => {
    const data = [{ user_id: "u-1" }, { user_id: "u-2" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data, error: null })
    );
    const result = await fetchContractUserIds("c-1", "active");
    expect(result).toEqual(data);
  });
});

describe("fetchContractSalaries", () => {
  it("returns salaries", async () => {
    const data = [{ salary: 5000 }, { salary: 8000 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data, error: null })
    );
    const result = await fetchContractSalaries("c-1", "active");
    expect(result).toEqual(data);
  });
});

describe("fetchActiveTemplatesByCompany", () => {
  it("returns active templates for company", async () => {
    const templates = [{ id: "t-1", name: "Tpl" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: templates, error: null })
    );
    const result = await fetchActiveTemplatesByCompany("c-1");
    expect(result).toEqual(templates);
  });
});

describe("fetchPendingSignaturesByEmail", () => {
  it("returns pending signatures", async () => {
    const sigs = [{ id: "s-1", signer_name: "John" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: sigs, error: null })
    );
    const result = await fetchPendingSignaturesByEmail("john@example.com");
    expect(result).toEqual(sigs);
  });
});

/* ================================================================== */
/*  Contract Documents                                                */
/* ================================================================== */

describe("fetchContractDocument", () => {
  it("returns document on success", async () => {
    const doc = { id: "d-1", contract_id: "ct-1" };
    queryMock.maybeSingle.mockResolvedValue({ data: doc, error: null });
    const result = await fetchContractDocument("ct-1");
    expect(result).toEqual(doc);
  });
});

describe("fetchCompletedDocuments", () => {
  it("returns completed documents", async () => {
    const docs = [{ contract_id: "ct-1", completed_at: "2025-01-01" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: docs, error: null })
    );
    const result = await fetchCompletedDocuments();
    expect(result).toEqual(docs);
  });
});

describe("updateDocumentStatus", () => {
  it("updates status without completedAt", async () => {
    await updateDocumentStatus("d-1", "completed");
    expect(queryMock.update).toHaveBeenCalledWith({
      signature_status: "completed",
    });
  });

  it("updates status with completedAt", async () => {
    await updateDocumentStatus("d-1", "completed", "2025-01-01T00:00:00Z");
    expect(queryMock.update).toHaveBeenCalledWith({
      signature_status: "completed",
      completed_at: "2025-01-01T00:00:00Z",
    });
  });
});

/* ================================================================== */
/*  Contract Signatures                                               */
/* ================================================================== */

describe("fetchSignaturesByDocument", () => {
  it("returns signatures ordered by signer_order", async () => {
    const sigs = [{ id: "s-1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: sigs, error: null })
    );
    const result = await fetchSignaturesByDocument("d-1");
    expect(result).toEqual(sigs);
  });
});

describe("fetchSignatureByToken", () => {
  it("returns signature matching token", async () => {
    const sig = { id: "s-1", signer_name: "A" };
    queryMock.maybeSingle.mockResolvedValue({ data: sig, error: null });
    const result = await fetchSignatureByToken("tok-1");
    expect(result).toEqual(sig);
  });
});

describe("updateSignature", () => {
  it("calls update with fields", async () => {
    await updateSignature("s-1", { signed_at: "2025-01-01" });
    expect(queryMock.update).toHaveBeenCalledWith({ signed_at: "2025-01-01" });
    expect(queryMock.eq).toHaveBeenCalledWith("id", "s-1");
  });
});

describe("recordSignature", () => {
  it("updates signature fields", async () => {
    await recordSignature("s-1", "https://sig.png", "127.0.0.1", "Chrome");
    expect(queryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        signature_image_url: "https://sig.png",
        ip_address: "127.0.0.1",
        user_agent: "Chrome",
      })
    );
  });

  it("adds token filter when provided", async () => {
    await recordSignature("s-1", "https://sig.png", null, null, "tok-1");
    expect(queryMock.eq).toHaveBeenCalledWith("signing_token", "tok-1");
  });
});

describe("fetchSignatureToken", () => {
  it("returns token from data", async () => {
    queryMock.maybeSingle.mockResolvedValue({
      data: { signing_token: "tok-abc" },
      error: null,
    });
    const result = await fetchSignatureToken("s-1");
    expect(result).toBe("tok-abc");
  });

  it("returns null when no data", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await fetchSignatureToken("s-1");
    expect(result).toBeNull();
  });
});

describe("updateSignaturePositions", () => {
  it("updates each position sequentially", async () => {
    const positions = [
      {
        id: "s-1",
        position_x: 10,
        position_y: 20,
        position_page: 1,
        position_width: 100,
        position_height: 50,
      },
      {
        id: "s-2",
        position_x: 30,
        position_y: 40,
        position_page: 2,
        position_width: 100,
        position_height: 50,
      },
    ];
    await updateSignaturePositions(positions);
    // Two calls to update
    expect(queryMock.update).toHaveBeenCalledTimes(2);
    expect(queryMock.eq).toHaveBeenCalledWith("id", "s-1");
    expect(queryMock.eq).toHaveBeenCalledWith("id", "s-2");
  });
});

describe("checkAllSignaturesCompleted", () => {
  it("returns true when all signed", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({
        data: [{ signed_at: "2025-01-01" }, { signed_at: "2025-01-02" }],
        error: null,
      })
    );
    const result = await checkAllSignaturesCompleted("d-1");
    expect(result).toBe(true);
  });

  it("returns false when some unsigned", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({
        data: [{ signed_at: "2025-01-01" }, { signed_at: null }],
        error: null,
      })
    );
    const result = await checkAllSignaturesCompleted("d-1");
    expect(result).toBe(false);
  });

  it("returns true when no signatures", async () => {
    const result = await checkAllSignaturesCompleted("d-1");
    expect(result).toBe(true);
  });
});

/* ================================================================== */
/*  Signature Storage                                                 */
/* ================================================================== */

describe("uploadSignatureImage", () => {
  it("uploads blob and returns public URL", async () => {
    const blob = new Blob(["data"]);
    const result = await uploadSignatureImage("sig.png", blob);
    expect(storageMock.upload).toHaveBeenCalledWith("sig.png", blob, {
      upsert: true,
    });
    expect(result).toBe("https://example.com/sig.png");
  });

  it("throws on upload error", async () => {
    const err = new Error("upload fail");
    storageMock.upload.mockResolvedValue({ error: err });
    await expect(uploadSignatureImage("sig.png", new Blob())).rejects.toBe(err);
  });
});

describe("checkSignatureStorageAvailable", () => {
  it("returns true when bucket exists", async () => {
    (supabase.storage.listBuckets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ name: "contract-signatures" }],
    });
    const result = await checkSignatureStorageAvailable();
    expect(result).toBe(true);
  });

  it("returns false when bucket missing", async () => {
    (supabase.storage.listBuckets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ name: "other-bucket" }],
    });
    const result = await checkSignatureStorageAvailable();
    expect(result).toBe(false);
  });

  it("returns false when data is null", async () => {
    (supabase.storage.listBuckets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
    });
    const result = await checkSignatureStorageAvailable();
    expect(result).toBe(false);
  });
});
