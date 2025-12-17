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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const adminNavigation = [
  { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  { name: "Colaboradores", href: "/dashboard/colaboradores", icon: Users },
  { name: "Contratos", href: "/dashboard/contratos", icon: FileText },
  { name: "Pagamentos", href: "/dashboard/pagamentos", icon: CreditCard },
  { name: "Convites", href: "/dashboard/convites", icon: UserPlus },
  { name: "Empresa", href: "/dashboard/empresa", icon: Building2 },
];

const masterAdminNavigation = [
  { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  { name: "Empresas", href: "/dashboard/empresas", icon: Building2 },
  { name: "Usuários", href: "/dashboard/usuarios", icon: Users },
  { name: "Contratos", href: "/dashboard/contratos", icon: FileText },
  { name: "Pagamentos", href: "/dashboard/pagamentos", icon: CreditCard },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, hasRole } = useAuth();

  const isMasterAdmin = hasRole("master_admin");

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      master_admin: "Master Admin",
      admin: "Administrador",
      financeiro: "Financeiro",
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

  const filteredNavigation = isMasterAdmin
    ? masterAdminNavigation
    : adminNavigation.filter((item) => {
        // Only admins can see company and invites
        if (["/dashboard/empresa", "/dashboard/convites"].includes(item.href)) {
          return isAdmin();
        }
        return true;
      });

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">A</span>
        </div>
        <span className="font-bold text-xl text-foreground">Aure</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
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

      {/* User Info */}
      <div className="border-t border-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
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
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/dashboard/perfil")}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
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
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
