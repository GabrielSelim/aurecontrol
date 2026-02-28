import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Erro ao carregar dados",
  message = "Ocorreu um erro inesperado. Tente novamente.",
  onRetry,
  retryLabel = "Tentar novamente",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 text-center ${className ?? ""}`}
      role="alert"
    >
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
