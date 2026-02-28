import { describe, it, expect } from "vitest";
import {
  inviteSchema,
  companyEditSchema,
  billingGenerateSchema,
} from "./forms";

describe("inviteSchema", () => {
  it("accepts valid invite with all fields", () => {
    const result = inviteSchema.safeParse({
      email: "user@example.com",
      inviteName: "João Silva",
      role: "colaborador",
      jobTitle: "Dev Senior",
      expiryDays: "14",
      customMessage: "Bem-vindo!",
      linkedContractId: "abc-123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal invite (only required fields)", () => {
    const result = inviteSchema.safeParse({
      email: "user@example.com",
      role: "colaborador",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = inviteSchema.safeParse({
      email: "bad",
      role: "colaborador",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing role", () => {
    const result = inviteSchema.safeParse({
      email: "a@b.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = inviteSchema.safeParse({
      email: "a@b.com",
      role: "superuser",
    });
    expect(result.success).toBe(false);
  });

  it.each(["admin", "colaborador", "financeiro", "gestor", "juridico"])(
    "accepts %s role",
    (role) => {
      expect(
        inviteSchema.safeParse({ email: "a@b.com", role }).success
      ).toBe(true);
    }
  );

  it("defaults optional fields", () => {
    const result = inviteSchema.safeParse({
      email: "a@b.com",
      role: "admin",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inviteName).toBe("");
      expect(result.data.expiryDays).toBe("7");
      expect(result.data.jobTitle).toBe("");
      expect(result.data.customMessage).toBe("");
      expect(result.data.linkedContractId).toBe("");
    }
  });
});

describe("companyEditSchema", () => {
  const validCompany = {
    name: "Empresa LTDA",
    cnpj: "12345678000199",
    email: "contato@empresa.com",
    phone: "1130001234",
    address: "Rua das Flores, 123",
    is_active: true,
  };

  it("accepts valid company data", () => {
    expect(companyEditSchema.safeParse(validCompany).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      companyEditSchema.safeParse({ ...validCompany, name: "" }).success
    ).toBe(false);
  });

  it("accepts empty optional fields", () => {
    const result = companyEditSchema.safeParse({
      ...validCompany,
      cnpj: "",
      email: "",
      phone: "",
      address: "",
    });
    expect(result.success).toBe(true);
  });

  it("defaults is_active to true", () => {
    const { is_active, ...rest } = validCompany;
    const result = companyEditSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });
});

describe("billingGenerateSchema", () => {
  it("accepts valid billing data", () => {
    const result = billingGenerateSchema.safeParse({
      selectedCompany: "company-uuid-123",
      referenceMonth: "2025-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty company", () => {
    expect(
      billingGenerateSchema.safeParse({
        selectedCompany: "",
        referenceMonth: "2025-01",
      }).success
    ).toBe(false);
  });

  it("rejects empty month", () => {
    expect(
      billingGenerateSchema.safeParse({
        selectedCompany: "abc",
        referenceMonth: "",
      }).success
    ).toBe(false);
  });
});
