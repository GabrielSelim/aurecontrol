import { describe, it, expect } from "vitest";
import {
  formatCPF,
  formatCurrency,
  parseCurrency,
  formatPhone,
  formatCNPJ,
  validateCPF,
  validatePhone,
  validateCNPJ,
  formatBRL,
} from "./masks";

describe("formatCPF", () => {
  it("formats a complete CPF", () => {
    expect(formatCPF("12345678901")).toBe("123.456.789-01");
  });

  it("formats a partial CPF", () => {
    expect(formatCPF("1234")).toBe("123.4");
  });

  it("strips non-numeric characters", () => {
    expect(formatCPF("123.456.789-01")).toBe("123.456.789-01");
  });

  it("handles empty string", () => {
    expect(formatCPF("")).toBe("");
  });

  it("truncates beyond 11 digits", () => {
    expect(formatCPF("123456789012345")).toBe("123.456.789-01");
  });
});

describe("formatCurrency", () => {
  it("formats cents into BRL", () => {
    expect(formatCurrency("150000")).toBe("R$ 1.500,00");
  });

  it("handles small values", () => {
    expect(formatCurrency("50")).toBe("R$ 0,50");
  });

  it("handles single digit", () => {
    expect(formatCurrency("5")).toBe("R$ 0,05");
  });

  it("returns empty for empty string", () => {
    expect(formatCurrency("")).toBe("");
  });

  it("strips non-numeric input", () => {
    expect(formatCurrency("R$ 1.500,00")).toBe("R$ 1.500,00");
  });
});

describe("parseCurrency", () => {
  it("parses BRL string to number", () => {
    expect(parseCurrency("R$ 1.500,00")).toBe(1500);
  });

  it("parses decimal values", () => {
    expect(parseCurrency("R$ 99,90")).toBe(99.9);
  });

  it("returns 0 for invalid input", () => {
    expect(parseCurrency("")).toBe(0);
    expect(parseCurrency("abc")).toBe(0);
  });
});

describe("formatPhone", () => {
  it("formats a mobile phone (11 digits)", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formats a landline (10 digits)", () => {
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
  });

  it("handles partial input", () => {
    expect(formatPhone("119")).toBe("(11) 9");
  });

  it("handles empty string", () => {
    expect(formatPhone("")).toBe("");
  });
});

describe("formatCNPJ", () => {
  it("formats a complete CNPJ", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formats a partial CNPJ", () => {
    expect(formatCNPJ("11222")).toBe("11.222");
  });

  it("handles empty string", () => {
    expect(formatCNPJ("")).toBe("");
  });
});

describe("validateCPF", () => {
  it("validates a correct CPF", () => {
    // 529.982.247-25 is a valid CPF
    expect(validateCPF("52998224725")).toBe(true);
  });

  it("rejects an all-same-digit CPF", () => {
    expect(validateCPF("11111111111")).toBe(false);
  });

  it("rejects a CPF with wrong check digits", () => {
    expect(validateCPF("12345678900")).toBe(false);
  });

  it("rejects a CPF with wrong length", () => {
    expect(validateCPF("123")).toBe(false);
  });
});

describe("validatePhone", () => {
  it("accepts 11-digit mobile", () => {
    expect(validatePhone("11987654321")).toBe(true);
  });

  it("accepts 10-digit landline", () => {
    expect(validatePhone("1134567890")).toBe(true);
  });

  it("rejects too short", () => {
    expect(validatePhone("123456789")).toBe(false);
  });

  it("rejects too long", () => {
    expect(validatePhone("119876543210")).toBe(false);
  });
});

describe("validateCNPJ", () => {
  it("validates a correct CNPJ", () => {
    // 11.222.333/0001-81 is a valid CNPJ
    expect(validateCNPJ("11222333000181")).toBe(true);
  });

  it("rejects all-same-digit CNPJ", () => {
    expect(validateCNPJ("11111111111111")).toBe(false);
  });

  it("rejects a CNPJ with wrong check digits", () => {
    expect(validateCNPJ("11222333000199")).toBe(false);
  });

  it("rejects a CNPJ with wrong length", () => {
    expect(validateCNPJ("1122233300018")).toBe(false);
  });
});

describe("formatBRL", () => {
  it("formats number as R$ currency", () => {
    const result = formatBRL(1500);
    expect(result).toContain("1.500");
    expect(result).toContain("R$");
  });

  it("formats zero", () => {
    const result = formatBRL(0);
    expect(result).toContain("0,00");
  });

  it("formats decimal values", () => {
    const result = formatBRL(99.9);
    expect(result).toContain("99,90");
  });
});
