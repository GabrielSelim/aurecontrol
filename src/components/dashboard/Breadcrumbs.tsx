import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const pathLabels: Record<string, string> = {
  dashboard: "Início",
  colaboradores: "Colaboradores",
  contratos: "Contratos",
  "templates-contrato": "Templates",
  "contratos-faturaveis": "PJ Faturáveis",
  pagamentos: "Pagamentos",
  convites: "Convites",
  empresa: "Empresa",
  empresas: "Empresas",
  faturamento: "Faturamento",
  notificacoes: "Notificações",
  configuracoes: "Configurações",
  perfil: "Perfil",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  // Don't render breadcrumbs on the root dashboard page
  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;

    return { path, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Início</span>
          </Link>
        </li>
        {crumbs.slice(1).map((crumb) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {crumb.isLast ? (
              <span className={cn("font-medium text-foreground")} aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.path} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
