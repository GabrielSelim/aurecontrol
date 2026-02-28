import { describe, it, expect } from "vitest";
import { getAuditActionLabel, getAuditCategoryLabel } from "./auditLog";

describe("getAuditActionLabel", () => {
  it("returns label for known action", () => {
    expect(getAuditActionLabel("contract_created")).toBe("Contrato criado");
  });

  it("returns label for signature_completed", () => {
    expect(getAuditActionLabel("signature_completed")).toBe("Assinatura realizada");
  });

  it("returns raw action for unknown key", () => {
    expect(getAuditActionLabel("unknown_action")).toBe("unknown_action");
  });

  it("returns label for pdf_downloaded", () => {
    expect(getAuditActionLabel("pdf_downloaded")).toBe("PDF baixado");
  });
});

describe("getAuditCategoryLabel", () => {
  it("returns label for contract", () => {
    expect(getAuditCategoryLabel("contract")).toBe("Contrato");
  });

  it("returns label for document", () => {
    expect(getAuditCategoryLabel("document")).toBe("Documento");
  });

  it("returns label for signature", () => {
    expect(getAuditCategoryLabel("signature")).toBe("Assinatura");
  });

  it("returns label for export", () => {
    expect(getAuditCategoryLabel("export")).toBe("Exportação");
  });

  it("returns label for general", () => {
    expect(getAuditCategoryLabel("general")).toBe("Geral");
  });

  it("returns raw category for unknown key", () => {
    expect(getAuditCategoryLabel("other")).toBe("other");
  });
});
