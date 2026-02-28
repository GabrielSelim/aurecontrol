import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Building2,
  Settings,
  UserPlus,
  Bell,
  FileSignature,
  Plus,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandAction {
  name: string;
  href?: string;
  icon: React.ElementType;
  shortcut?: string;
  action?: () => void;
  keywords?: string[];
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { hasRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isMasterAdmin = hasRole("master_admin");

  // Navigation items matching DashboardLayout
  const navigationItems = useMemo<CommandAction[]>(() => {
    const items: CommandAction[] = [];

    if (isMasterAdmin) {
      items.push(
        { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard, shortcut: "⌃⇧H", keywords: ["home", "início", "dashboard"] },
        { name: "Empresas", href: "/dashboard/empresas", icon: Building2, shortcut: "⌃⇧E", keywords: ["empresa", "company"] },
        { name: "PJ Faturáveis", href: "/dashboard/contratos-faturaveis", icon: CreditCard, keywords: ["faturável", "pj", "billing"] },
        { name: "Faturamento", href: "/dashboard/faturamento", icon: CreditCard, keywords: ["fatura", "billing", "cobrança"] },
        { name: "Notificações", href: "/dashboard/notificacoes", icon: Bell, shortcut: "⌃⇧N", keywords: ["alerta", "aviso"] },
        { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings, shortcut: "⌃⇧K", keywords: ["config", "preferências"] },
      );
    } else {
      items.push(
        { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard, shortcut: "⌃⇧H", keywords: ["home", "início", "dashboard"] },
      );

      if (hasRole("admin")) {
        items.push(
          { name: "Colaboradores", href: "/dashboard/colaboradores", icon: Users, shortcut: "⌃⇧C", keywords: ["funcionário", "equipe", "team"] },
          { name: "Contratos", href: "/dashboard/contratos", icon: FileText, shortcut: "⌃⇧T", keywords: ["documento", "agreement"] },
          { name: "Templates", href: "/dashboard/templates-contrato", icon: FileSignature, keywords: ["modelo", "template"] },
          { name: "Pagamentos", href: "/dashboard/pagamentos", icon: CreditCard, shortcut: "⌃⇧P", keywords: ["pagamento", "payment", "financeiro"] },
          { name: "Convites", href: "/dashboard/convites", icon: UserPlus, shortcut: "⌃⇧I", keywords: ["convite", "invite"] },
          { name: "Empresa", href: "/dashboard/empresa", icon: Building2, shortcut: "⌃⇧E", keywords: ["company", "organização"] },
        );
      }

      if (hasRole("gestor")) {
        items.push(
          { name: "Colaboradores", href: "/dashboard/colaboradores", icon: Users, shortcut: "⌃⇧C", keywords: ["funcionário", "equipe"] },
        );
      }

      if (hasRole("juridico")) {
        items.push(
          { name: "Contratos", href: "/dashboard/contratos", icon: FileText, shortcut: "⌃⇧T", keywords: ["documento"] },
          { name: "Templates", href: "/dashboard/templates-contrato", icon: FileSignature, keywords: ["modelo"] },
        );
      }

      if (hasRole("financeiro")) {
        items.push(
          { name: "Pagamentos", href: "/dashboard/pagamentos", icon: CreditCard, shortcut: "⌃⇧P", keywords: ["pagamento", "financeiro"] },
        );
      }
    }

    return items;
  }, [isMasterAdmin, hasRole]);

  // Quick actions
  const quickActions = useMemo<CommandAction[]>(() => {
    const actions: CommandAction[] = [];

    if (hasRole("admin") || hasRole("juridico")) {
      actions.push(
        { name: "Novo Contrato", href: "/dashboard/contratos", icon: Plus, keywords: ["criar contrato", "add contract"] },
      );
    }

    if (hasRole("admin")) {
      actions.push(
        { name: "Convidar Colaborador", href: "/dashboard/convites", icon: UserPlus, keywords: ["novo convite", "invite"] },
        { name: "Novo Pagamento", href: "/dashboard/pagamentos", icon: Plus, keywords: ["criar pagamento", "add payment"] },
      );
    }

    return actions;
  }, [hasRole]);

  // Theme & system actions
  const systemActions = useMemo<CommandAction[]>(() => [
    {
      name: theme === "dark" ? "Modo Claro" : "Modo Escuro",
      icon: theme === "dark" ? Sun : Moon,
      keywords: ["tema", "theme", "dark", "light", "escuro", "claro"],
      action: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    {
      name: "Sair",
      icon: LogOut,
      keywords: ["logout", "desconectar", "sair"],
      action: async () => {
        await signOut();
        navigate("/");
      },
    },
  ], [theme, setTheme, signOut, navigate]);

  const runAction = (item: CommandAction) => {
    onOpenChange(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      navigate(item.href);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar páginas e ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Navegação">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.name}
              value={[item.name, ...(item.keywords || [])].join(" ")}
              onSelect={() => runAction(item)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.name}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        {quickActions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ações Rápidas">
              {quickActions.map((item) => (
                <CommandItem
                  key={item.name}
                  value={[item.name, ...(item.keywords || [])].join(" ")}
                  onSelect={() => runAction(item)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Sistema">
          {systemActions.map((item) => (
            <CommandItem
              key={item.name}
              value={[item.name, ...(item.keywords || [])].join(" ")}
              onSelect={() => runAction(item)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
