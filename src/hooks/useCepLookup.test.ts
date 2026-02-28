import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCepLookup } from "./useCepLookup";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

describe("useCepLookup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatCep", () => {
    it("formats a complete CEP", () => {
      const { result } = renderHook(() => useCepLookup());
      expect(result.current.formatCep("01310100")).toBe("01310-100");
    });

    it("returns partial input unchanged when ≤5 digits", () => {
      const { result } = renderHook(() => useCepLookup());
      expect(result.current.formatCep("01310")).toBe("01310");
    });

    it("strips non-digit characters", () => {
      const { result } = renderHook(() => useCepLookup());
      expect(result.current.formatCep("01310-100")).toBe("01310-100");
    });

    it("formats short input correctly", () => {
      const { result } = renderHook(() => useCepLookup());
      expect(result.current.formatCep("013")).toBe("013");
    });
  });

  describe("lookupCep", () => {
    it("returns null for CEP with wrong length", async () => {
      const { result } = renderHook(() => useCepLookup());

      let address: unknown;
      await act(async () => {
        address = await result.current.lookupCep("12345");
      });

      expect(address).toBeNull();
    });

    it("returns address data on valid CEP", async () => {
      const mockResponse = {
        cep: "01310100",
        logradouro: "Avenida Paulista",
        complemento: "até 610 - lado par",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCepLookup());

      let address: unknown;
      await act(async () => {
        address = await result.current.lookupCep("01310100");
      });

      expect(address).toEqual({
        cep: "01310-100",
        street: "Avenida Paulista",
        number: "",
        complement: "até 610 - lado par",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      });
    });

    it("returns null and toasts error when CEP not found", async () => {
      const { toast } = await import("sonner");

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ erro: true }),
      });

      const { result } = renderHook(() => useCepLookup());

      let address: unknown;
      await act(async () => {
        address = await result.current.lookupCep("00000000");
      });

      expect(address).toBeNull();
      expect(toast.error).toHaveBeenCalledWith("CEP não encontrado");
    });

    it("returns null and toasts on network error", async () => {
      const { toast } = await import("sonner");

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useCepLookup());

      let address: unknown;
      await act(async () => {
        address = await result.current.lookupCep("01310100");
      });

      expect(address).toBeNull();
      expect(toast.error).toHaveBeenCalledWith("Erro ao buscar CEP. Tente novamente.");
    });

    it("sets isLoading during fetch", async () => {
      let resolveFetch: (v: unknown) => void;
      global.fetch = vi.fn().mockReturnValue(
        new Promise((r) => {
          resolveFetch = r;
        }),
      );

      const { result } = renderHook(() => useCepLookup());
      expect(result.current.isLoading).toBe(false);

      let lookupPromise: Promise<unknown>;
      act(() => {
        lookupPromise = result.current.lookupCep("01310100");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFetch!({
          json: () => Promise.resolve({ cep: "01310100", logradouro: "", complemento: "", bairro: "", localidade: "", uf: "" }),
        });
        await lookupPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
