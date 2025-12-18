import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
};

const masterAdminNavigation = [
  navigationItems.visaoGeral,
  navigationItems.empresas,
  navigationItems.contratosFaturaveis,
  navigationItems.faturamento,
  navigationItems.notificacoes,
  navigationItems.configuracoes,
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, hasRole } = useAuth();

  const isMasterAdmin = hasRole("master_admin");

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      master_admin: "Master Admin",
      admin: "Administrador",
      financeiro: "Financeiro",
      juridico: "Jurídico",
      gestor: "Gestor",
      colaborador: "Colaborador",
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
    
    // Colaborador: only visão geral (already added)
    
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
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">A</span>
        </div>
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
        <nav className="space-y-1">
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
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
