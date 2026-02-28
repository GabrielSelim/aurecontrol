import { describe, it, expect, vi } from "vitest";
import { handleApiError } from "./handleApiError";

// Suppress logger output during tests
vi.mock("./logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe("handleApiError", () => {
  it("should return fallback message for non-Error values", () => {
    expect(handleApiError("string error")).toBe("Ocorreu um erro inesperado");
    expect(handleApiError(null)).toBe("Ocorreu um erro inesperado");
    expect(handleApiError(undefined)).toBe("Ocorreu um erro inesperado");
    expect(handleApiError(42)).toBe("Ocorreu um erro inesperado");
  });

  it("should return custom fallback message", () => {
    expect(handleApiError("err", "Erro ao salvar")).toBe("Erro ao salvar");
  });

  it("should return error.message for simple, safe messages", () => {
    const error = new Error("Campo obrigatório");
    expect(handleApiError(error)).toBe("Campo obrigatório");
  });

  it("should hide messages containing 'duplicate key'", () => {
    const error = new Error("duplicate key value violates unique constraint");
    expect(handleApiError(error, "Erro ao salvar")).toBe("Erro ao salvar");
  });

  it("should hide messages containing 'violates'", () => {
    const error = new Error("violates foreign key constraint");
    expect(handleApiError(error, "Erro ao deletar")).toBe("Erro ao deletar");
  });

  it("should hide messages containing 'PGRST'", () => {
    const error = new Error("PGRST301: JWT expired");
    expect(handleApiError(error, "Sessão expirada")).toBe("Sessão expirada");
  });

  it("should hide messages containing 'JWT'", () => {
    const error = new Error("JWT token is invalid");
    expect(handleApiError(error, "Erro de autenticação")).toBe("Erro de autenticação");
  });

  it("should hide messages containing 'FetchError'", () => {
    const error = new Error("FetchError: network request failed");
    expect(handleApiError(error, "Erro de rede")).toBe("Erro de rede");
  });

  it("should hide messages containing 'NetworkError'", () => {
    const error = new Error("NetworkError when attempting to fetch");
    expect(handleApiError(error, "Erro de rede")).toBe("Erro de rede");
  });

  it("should hide very long error messages", () => {
    const error = new Error("a".repeat(200));
    expect(handleApiError(error, "Erro")).toBe("Erro");
  });

  it("should allow short safe messages through", () => {
    const error = new Error("Email já cadastrado");
    expect(handleApiError(error)).toBe("Email já cadastrado");
  });
});
