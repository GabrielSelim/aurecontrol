import { describe, it, expect } from "vitest";
import { buildWitnessNotificationEmail } from "./emailTemplates";

describe("buildWitnessNotificationEmail", () => {
  it("should return a subject and html string", () => {
    const result = buildWitnessNotificationEmail({
      recipientName: "João",
      contractorName: "Maria",
      signingLink: null,
    });

    expect(result.subject).toContain("testemunha");
    expect(result.html).toContain("João");
    expect(result.html).toContain("Maria");
  });

  it("should include signing link button when provided", () => {
    const result = buildWitnessNotificationEmail({
      recipientName: "João",
      contractorName: "Maria",
      signingLink: "https://app.aure.com/assinar?token=abc123",
    });

    expect(result.html).toContain("https://app.aure.com/assinar?token=abc123");
    expect(result.html).toContain("Assinar Contrato");
    expect(result.html).not.toContain("Em breve");
  });

  it("should show fallback text when no signing link", () => {
    const result = buildWitnessNotificationEmail({
      recipientName: "João",
      contractorName: "Maria",
      signingLink: null,
    });

    expect(result.html).toContain("Em breve");
    expect(result.html).not.toContain("Assinar Contrato");
  });

  it("should include contractor name in the body", () => {
    const result = buildWitnessNotificationEmail({
      recipientName: "Ana",
      contractorName: "Carlos Oliveira",
      signingLink: null,
    });

    expect(result.html).toContain("Carlos Oliveira");
  });

  it("should include Aure system footer", () => {
    const result = buildWitnessNotificationEmail({
      recipientName: "Test",
      contractorName: "Test",
      signingLink: null,
    });

    expect(result.html).toContain("email automático do sistema Aure");
  });
});
