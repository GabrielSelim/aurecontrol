import { describe, it, expect } from "vitest";
import {
  loginSchema,
  recuperarSenhaSchema,
  atualizarSenhaSchema,
  registroMasterSchema,
  passwordRules,
} from "./auth";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("recuperarSenhaSchema", () => {
  it("accepts valid email", () => {
    expect(
      recuperarSenhaSchema.safeParse({ email: "a@b.com" }).success
    ).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(
      recuperarSenhaSchema.safeParse({ email: "notanemail" }).success
    ).toBe(false);
  });
});

describe("atualizarSenhaSchema", () => {
  const validPw = "Abcdef1!";

  it("accepts matching strong passwords", () => {
    const result = atualizarSenhaSchema.safeParse({
      password: validPw,
      confirmPassword: validPw,
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = atualizarSenhaSchema.safeParse({
      password: validPw,
      confirmPassword: "Different1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("confirmPassword"))
      ).toBe(true);
    }
  });

  it("rejects weak password (no uppercase)", () => {
    const result = atualizarSenhaSchema.safeParse({
      password: "abcdefg1!",
      confirmPassword: "abcdefg1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = atualizarSenhaSchema.safeParse({
      password: "Ab1!",
      confirmPassword: "Ab1!",
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordRules", () => {
  it("accepts strong password", () => {
    expect(passwordRules.safeParse("Str0ng!Pass").success).toBe(true);
  });

  it.each([
    ["short", "Ab1!"],
    ["no uppercase", "abcdefg1!"],
    ["no lowercase", "ABCDEFG1!"],
    ["no number", "Abcdefg!!"],
    ["no special", "Abcdefg12"],
  ])("rejects %s password", (_label, pw) => {
    expect(passwordRules.safeParse(pw).success).toBe(false);
  });
});

describe("registroMasterSchema", () => {
  const validData = {
    fullName: "João Silva",
    email: "joao@email.com",
    cpf: "12345678901",
    phone: "11999998888",
    password: "Str0ng!Pass",
    acceptedTerms: true as const,
    acceptedPrivacy: true as const,
  };

  it("accepts valid master admin data", () => {
    expect(registroMasterSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects without terms accepted", () => {
    const result = registroMasterSchema.safeParse({
      ...validData,
      acceptedTerms: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects without privacy accepted", () => {
    const result = registroMasterSchema.safeParse({
      ...validData,
      acceptedPrivacy: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects short name", () => {
    const result = registroMasterSchema.safeParse({
      ...validData,
      fullName: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registroMasterSchema.safeParse({
      ...validData,
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short CPF", () => {
    const result = registroMasterSchema.safeParse({
      ...validData,
      cpf: "123",
    });
    expect(result.success).toBe(false);
  });
});
