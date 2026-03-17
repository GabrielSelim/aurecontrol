import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Sentry } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught:", error, errorInfo);
    Sentry.withScope((scope) => {
      scope.setExtra("componentStack", errorInfo.componentStack);
      Sentry.captureException(error);
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Algo deu errado
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Ocorreu um erro inesperado. Tente recarregar a página ou volte mais tarde.
            </p>
            {this.state.error && (
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 max-w-lg overflow-auto rounded-lg bg-muted p-3 text-left">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
            <Button onClick={() => window.location.href = "/"}>
              Voltar ao início
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
