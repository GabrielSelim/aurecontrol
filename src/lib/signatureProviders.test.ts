import { describe, it, expect } from "vitest";
import { SIGNATURE_PROVIDERS } from "./signatureProviders";

describe("SIGNATURE_PROVIDERS", () => {
  it("has all 6 providers defined", () => {
    const keys = Object.keys(SIGNATURE_PROVIDERS);
    expect(keys).toHaveLength(6);
    expect(keys).toContain("internal");
    expect(keys).toContain("clicksign");
    expect(keys).toContain("docusign");
    expect(keys).toContain("d4sign");
    expect(keys).toContain("autentique");
    expect(keys).toContain("zapsign");
  });

  it("internal provider is free", () => {
    expect(SIGNATURE_PROVIDERS.internal.priceRange).toBe("Gratuito");
    expect(SIGNATURE_PROVIDERS.internal.supportsIcpBrasil).toBe(false);
  });

  it("all external providers have website", () => {
    const external = Object.entries(SIGNATURE_PROVIDERS).filter(([k]) => k !== "internal");
    external.forEach(([, provider]) => {
      expect(provider.website).toBeTruthy();
      expect(provider.website).toMatch(/^https:\/\//);
    });
  });

  it("all external providers support ICP-Brasil", () => {
    const external = Object.entries(SIGNATURE_PROVIDERS).filter(([k]) => k !== "internal");
    external.forEach(([, provider]) => {
      expect(provider.supportsIcpBrasil).toBe(true);
    });
  });

  it("each provider has displayName and description", () => {
    Object.values(SIGNATURE_PROVIDERS).forEach((provider) => {
      expect(provider.displayName).toBeTruthy();
      expect(provider.description).toBeTruthy();
    });
  });
});
