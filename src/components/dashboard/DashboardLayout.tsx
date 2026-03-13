import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Building2,
  Settings,
  LogOut,
  Menu,
  UserPlus,
  ChevronDown,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  Search,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { Breadcrumbs } from "./Breadcrumbs";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Navigation items by role
const navigationItems = {
  visaoGeral: { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  colaboradores: { name: "Colaboradores", href: "/dashboard/colaboradores", icon: Users },
  contratos: { name: "Contratos", href: "/dashboard/contratos", icon: FileText },
  templatesContrato: { name: "Templates", href: "/dashboard/templates-contrato", icon: FileSignature },
  contratosFaturaveis: { name: "PJ Faturáveis", href: "/dashboard/contratos-faturaveis", icon: CreditCard },
  pagamentos: { name: "Pagamentos", href: "/dashboard/pagamentos", icon: CreditCard },
  convites: { name: "Convites", href: "/dashboard/convites", icon: UserPlus },
  empresa: { name: "Empresa", href: "/dashboard/empresa", icon: Building2 },
  empresas: { name: "Empresas", href: "/dashboard/empresas", icon: Building2 },
  faturamento: { name: "Faturamento", href: "/dashboard/faturamento", icon: CreditCard },
  notificacoes: { name: "Notificações", href: "/dashboard/notificacoes", icon: Bell },
  configuracoes: { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
  auditoria: { name: "Auditoria", href: "/dashboard/auditoria", icon: ShieldCheck },
  // PJ
  pjDashboard: { name: "Meu Painel", href: "/pj/dashboard", icon: LayoutDashboard },
  pjContratos: { name: "Meus Contratos", href: "/pj/contratos", icon: FileText },
  pjPagamentos: { name: "Meus Pagamentos", href: "/pj/pagamentos", icon: CreditCard },
  pjPerfil: { name: "Meu Perfil", href: "/pj/perfil", icon: Briefcase },
};

const masterAdminNavigation = [
  navigationItems.visaoGeral,
  navigationItems.empresas,
  navigationItems.contratosFaturaveis,
  navigationItems.faturamento,
  navigationItems.notificacoes,
  navigationItems.configuracoes,
  navigationItems.auditoria,
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, hasRole, isPJ } = useAuth();
  useKeyboardShortcuts();
  useSessionTimeout();

  // Ctrl+K to open command palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const isMasterAdmin = hasRole("master_admin");

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      master_admin: "Master Admin",
      admin: "Administrador",
      financeiro: "Financeiro",
      juridico: "Jurídico",
      gestor: "Gestor",
      colaborador: "Colaborador",
      pj: "Prestador PJ",
    };
    return labels[role] || role;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Build navigation based on user role
  const getNavigationForRole = () => {
    // PJ sees only their own portal
    if (isPJ) {
      return [
        navigationItems.pjDashboard,
        navigationItems.pjContratos,
        navigationItems.pjPagamentos,
        navigationItems.pjPerfil,
      ];
    }

    if (isMasterAdmin) {
      return masterAdminNavigation;
    }
    
    const nav = [navigationItems.visaoGeral];
    
    // Admin sees everything
    if (hasRole("admin")) {
      nav.push(
        navigationItems.colaboradores,
        navigationItems.contratos,
        navigationItems.templatesContrato,
        navigationItems.pagamentos,
        navigationItems.convites,
        navigationItems.empresa
      );
      return nav;
    }
    
    // Gestor: only collaborators
    if (hasRole("gestor")) {
      nav.push(navigationItems.colaboradores);
    }
    
    // Juridico: contracts and templates
    if (hasRole("juridico")) {
      nav.push(navigationItems.contratos);
      nav.push(navigationItems.templatesContrato);
    }
    
    // Financeiro: only payments
    if (hasRole("financeiro")) {
      nav.push(navigationItems.pagamentos);
    }
    
    return nav;
  };

  const filteredNavigation = getNavigationForRole();

  const Sidebar = ({ collapsed = false, showCollapseButton = false }: { collapsed?: boolean; showCollapseButton?: boolean }) => (
    <div className={cn(
      "flex h-full flex-col bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-72"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center gap-2 border-b border-border transition-all duration-300",
        collapsed ? "px-3 justify-center" : "px-6"
      )}>
        <img src="/logo_aure.svg" alt="Aure" className="h-8 w-auto flex-shrink-0" />
        {!collapsed && <span className="font-bold text-xl text-foreground">Aure</span>}
      </div>

      {/* Collapse Button */}
      {showCollapseButton && (
        <div className={cn(
          "flex py-2 border-b border-border",
          collapsed ? "px-2 justify-center" : "px-3 justify-end"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!collapsed)}
            className="h-8 w-8"
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className={cn(
        "flex-1 py-4 transition-all duration-300",
        collapsed ? "px-2" : "px-3"
      )}>
        {/* Search trigger */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCommandOpen(true)}
                className="flex w-full items-center justify-center rounded-lg p-2.5 mb-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Buscar (Ctrl+K)</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 mb-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">Ctrl</span>K
            </kbd>
          </button>
        )}

        <nav className="space-y-1" aria-label="Menu principal">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            
            if (collapsed) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center justify-center rounded-lg p-2.5 transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Notification Bell - Desktop */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Notificações</span>
            <NotificationBell />
          </div>
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-2 border-t border-border flex justify-center">
          <NotificationBell />
        </div>
      )}

      {/* Theme Toggle */}
      {!collapsed && (
        <div className="px-4 py-1 border-t border-border">
          <ThemeToggle />
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-1 border-t border-border flex justify-center">
          <ThemeToggle collapsed />
        </div>
      )}

      {/* User Info */}
      <div className={cn(
        "border-t border-border transition-all duration-300",
        collapsed ? "p-2" : "p-4"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button className="flex w-full items-center justify-center rounded-lg p-2 hover:bg-muted transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {profile?.full_name ? getInitials(profile.full_name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {roles.map((r) => getRoleLabel(r.role)).join(", ")}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {profile?.full_name ? getInitials(profile.full_name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {roles.map((r) => getRoleLabel(r.role)).join(", ")}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/dashboard/perfil")}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Ir para o conteúdo principal
      </a>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:flex transition-all duration-300",
        isCollapsed ? "lg:w-16" : "lg:w-72"
      )}>
        <Sidebar collapsed={isCollapsed} showCollapseButton />
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        isCollapsed ? "lg:pl-16" : "lg:pl-72"
      )}>
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:hidden">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-xl text-foreground">Aure</span>
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* Page Content */}
        <main id="main-content" className="p-6" role="main">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
