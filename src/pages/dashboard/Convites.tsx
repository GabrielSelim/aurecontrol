import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  Send,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invite {
  id: string;
  email: string;
  token: string;
  company_id: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

const Convites = () => {
  const { profile } = useAuth();
  const [convites, setConvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    fetchConvites();
  }, [profile?.company_id]);

  const fetchConvites = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConvites(data || []);
    } catch (error) {
      console.error("Error fetching convites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendInviteEmail = async (inviteEmail: string, token: string, roleName: string) => {
    const inviteLink = `${window.location.origin}/registro?convite=${token}`;
    const companyName = profile?.full_name ? `equipe de ${profile.full_name}` : "nossa equipe";
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .role-badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Você foi convidado!</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p>Você foi convidado para fazer parte da <strong>${companyName}</strong> no sistema Aure.</p>
            <p>Seu cargo será: <span class="role-badge">${roleName}</span></p>
            <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
            <p style="text-align: center;">
              <a href="${inviteLink}" class="button">Aceitar Convite</a>
            </p>
            <p style="font-size: 12px; color: #666;">
              Ou copie este link: <br>
              <a href="${inviteLink}">${inviteLink}</a>
            </p>
            <p style="font-size: 12px; color: #999;">Este convite expira em 7 dias.</p>
          </div>
          <div class="footer">
            <p>Aure System - Gestão de Colaboradores</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: inviteEmail,
          subject: `Convite para ${companyName} - Aure System`,
          html,
          from_name: "Aure System",
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error sending invite email:", error);
      return false;
    }
  };

  const handleCreateInvite = async () => {
    if (!profile?.company_id || !email || !role) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if invite already exists
      const { data: existingInvite } = await supabase
        .from("invites")
        .select("id")
        .eq("email", email)
        .eq("company_id", profile.company_id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        toast.error("Já existe um convite pendente para este e-mail");
        setIsSubmitting(false);
        return;
      }

      const { data: newInvite, error } = await supabase
        .from("invites")
        .insert({
          email,
          role: role as "admin" | "colaborador" | "financeiro" | "gestor" | "master_admin",
          company_id: profile.company_id,
          invited_by: profile.user_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email
      const roleName = getRoleLabel(role);
      const emailSent = await sendInviteEmail(email, newInvite.token, roleName);

      if (emailSent) {
        toast.success("Convite enviado por e-mail!");
      } else {
        toast.success("Convite criado! (E-mail não pôde ser enviado)");
      }

      setIsDialogOpen(false);
      setEmail("");
      setRole("");
      fetchConvites();
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error("Erro ao criar convite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/registro?convite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleResendEmail = async (convite: Invite) => {
    try {
      toast.loading("Reenviando email...");
      const roleName = getRoleLabel(convite.role);
      const emailSent = await sendInviteEmail(convite.email, convite.token, roleName);
      
      toast.dismiss();
      if (emailSent) {
        toast.success("E-mail reenviado com sucesso!");
      } else {
        toast.error("Erro ao reenviar e-mail");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error resending email:", error);
      toast.error("Erro ao reenviar e-mail");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("invites")
        .update({ status: "cancelled" })
        .eq("id", inviteId);

      if (error) throw error;

      toast.success("Convite cancelado");
      fetchConvites();
    } catch (error) {
      console.error("Error cancelling invite:", error);
      toast.error("Erro ao cancelar convite");
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      financeiro: "Financeiro",
      gestor: "Gestor",
      colaborador: "Colaborador",
    };
    return labels[role] || role;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "expired":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      accepted: "default",
      pending: "secondary",
      expired: "outline",
      cancelled: "destructive",
    };
    return variants[status] || "outline";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      accepted: "Aceito",
      pending: "Pendente",
      expired: "Expirado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const filteredConvites = convites.filter((c) =>
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = convites.filter(
    (c) => c.status === "pending" && !isExpired(c.expires_at)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Convites</h1>
          <p className="text-muted-foreground mt-1">
            Convide novos colaboradores para sua empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Convite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Convidar Colaborador</DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail para um novo colaborador
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  placeholder="colaborador@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateInvite} disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Aguardando aceitação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {convites.filter((c) => c.status === "accepted").length}
            </div>
            <p className="text-xs text-muted-foreground">Colaboradores adicionados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convites.length}</div>
            <p className="text-xs text-muted-foreground">Convites enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Convites</CardTitle>
          <CardDescription>
            {convites.length} convite(s) enviado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="hidden md:table-cell">Expira em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredConvites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Nenhum convite encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConvites.map((convite) => {
                    const expired = isExpired(convite.expires_at);
                    const status = expired && convite.status === "pending" ? "expired" : convite.status;

                    return (
                      <TableRow key={convite.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{convite.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleLabel(convite.role)}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(convite.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status)}
                            <Badge variant={getStatusBadgeVariant(status)}>
                              {getStatusLabel(status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleResendEmail(convite)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Reenviar e-mail
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyLink(convite.token)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copiar link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleCancelInvite(convite.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Cancelar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {status !== "pending" && (
                                <DropdownMenuItem disabled>
                                  Nenhuma ação disponível
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Convites;
