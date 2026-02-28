import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("renders default title and message", () => {
    render(<ErrorState />);
    expect(screen.getByText("Erro ao carregar dados")).toBeInTheDocument();
    expect(screen.getByText("Ocorreu um erro inesperado. Tente novamente.")).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    render(<ErrorState title="Falha na rede" message="Verifique sua conexão" />);
    expect(screen.getByText("Falha na rede")).toBeInTheDocument();
    expect(screen.getByText("Verifique sua conexão")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    const button = screen.getByText("Tentar novamente");
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry is omitted", () => {
    render(<ErrorState />);
    expect(screen.queryByText("Tentar novamente")).not.toBeInTheDocument();
  });

  it("renders custom retry label", () => {
    render(<ErrorState onRetry={() => {}} retryLabel="Recarregar" />);
    expect(screen.getByText("Recarregar")).toBeInTheDocument();
  });

  it("has role alert for accessibility", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
