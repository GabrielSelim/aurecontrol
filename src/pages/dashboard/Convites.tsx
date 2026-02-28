import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteSchema, type InviteFormData } from "@/schemas/forms";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkDuplicateInvite,
  createInvite,
} from "@/services/inviteService";
import {
  useInvites,
  useAvailableContracts,
  useExtendInviteExpiry,
  useRenewExpiredInvite,
  useCancelInvite,
  type InviteWithOnboarding,
} from "@/hooks/queries/useInviteQueries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { sendEmail } from "@/services/edgeFunctionService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
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
  RefreshCw,
  TrendingUp,
  Eye,
  CalendarPlus,
  Filter,
  MessageSquare,
  Upload,
  FileSpreadsheet,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/sanitize";

type Invite = InviteWithOnboarding;

const Convites = () => {
  useDocumentTitle("Convites");
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // --- TanStack Query hooks ------------------------------------------------
  const invitesQuery = useInvites(profile?.company_id);
  const contractsQuery = useAvailableContracts(profile?.company_id);
  const extendMutation = useExtendInviteExpiry();
  const renewMutation = useRenewExpiredInvite();
  const cancelMutation = useCancelInvite();

  // Derived server state
  const convites = invitesQuery.data ?? [];
  const availableContracts = contractsQuery.data ?? [];
  const isLoading = invitesQuery.isLoading;

  // --- Local UI state -------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [onboardingFilter, setOnboardingFilter] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<{sent: number; failed: number; errors: string[]} | null>(null);

  // Invite form
  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      inviteName: "",
      jobTitle: "",
      expiryDays: "7",
      customMessage: "",
      linkedContractId: "",
    },
  });
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const inviteName = inviteForm.watch("inviteName");

  const sendInviteEmail = async (inviteEmail: string, token: string, roleName: string, customMsg?: string, days?: number) => {
    const inviteLink = `${window.location.origin}/registro?convite=${token}`;
    const companyName = profile?.full_name ? `equipe de ${profile.full_name}` : "nossa equipe";
    const expDays = days || 7;
    
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
            <p>Olá${inviteName ? `, ${inviteName}` : ""}!</p>
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
            <p style="font-size: 12px; color: #999;">Este convite expira em ${expDays} dias.</p>
          </div>
          <div class="footer">
            <p>Aure System - Gestão de Colaboradores</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: inviteEmail,
        subject: `Convite para ${companyName} - Aure System`,
        html,
        from_name: "Aure System",
      });

      return true;
    } catch (error) {
      logger.error("Error sending invite email:", error);
      return false;
    }
  };

  const watchedInvite = inviteForm.watch();

  const generateEmailPreviewHtml = useMemo(() => {
    if (!showEmailPreview || !watchedInvite.email || !watchedInvite.role) return "";
    const companyName = profile?.full_name ? `equipe de ${profile.full_name}` : "nossa equipe";
    const roleName = getRoleLabel(watchedInvite.role);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; }
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
            <h1>\uD83C\uDF89 Você foi convidado!</h1>
          </div>
          <div class="content">
            <p>Olá${watchedInvite.inviteName ? `, ${watchedInvite.inviteName}` : ""}!</p>
            <p>Você foi convidado para fazer parte da <strong>${companyName}</strong> no sistema Aure.</p>
            <p>Seu cargo será: <span class="role-badge">${roleName}</span></p>
            ${watchedInvite.customMessage ? `<p style="background: #f0f0f0; padding: 12px; border-radius: 8px; border-left: 3px solid #667eea;"><em>${watchedInvite.customMessage}</em></p>` : ""}
            <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
            <p style="text-align: center;">
              <a href="#" class="button">Aceitar Convite</a>
            </p>
            <p style="font-size: 12px; color: #999;">Este convite expira em ${watchedInvite.expiryDays} dias.</p>
          </div>
          <div class="footer">
            <p>Aure System - Gestão de Colaboradores</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }, [showEmailPreview, watchedInvite.email, watchedInvite.role, watchedInvite.inviteName, watchedInvite.customMessage, watchedInvite.expiryDays, profile?.full_name]);

  const handleExtendValidade = async (convite: Invite) => {
    try {
      toast.loading("Estendendo validade...", { id: "extend" });

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      await extendMutation.mutateAsync({
        inviteId: convite.id,
        newExpiresAt: newExpiry.toISOString(),
        companyId: convite.company_id,
      });

      toast.dismiss("extend");
      toast.success(`Validade estendida por mais 7 dias para ${convite.email}`);
    } catch (error) {
      toast.dismiss("extend");
      logger.error("Error extending invite:", error);
      toast.error("Erro ao estender validade");
    }
  };

  const handleCreateInvite = async (data: InviteFormData) => {
    if (!profile?.company_id) {
      toast.error("Empresa não encontrada");
      return;
    }

    try {
      // Check if invite already exists
      const existingInvite = await checkDuplicateInvite(data.email, profile.company_id);

      if (existingInvite) {
        toast.error("Já existe um convite pendente para este e-mail");
        return;
      }

      const expDays = parseInt(data.expiryDays) || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expDays);

      const newInvite = await createInvite({
        email: data.email,
        role: data.role,
        company_id: profile.company_id,
        invited_by: profile.user_id,
        expires_at: expiresAt.toISOString(),
      });

      // Send email
      const roleName = getRoleLabel(data.role);
      const emailSent = await sendInviteEmail(data.email, newInvite.token, roleName, data.customMessage || undefined, expDays);

      const inviteLink = `${window.location.origin}/registro?convite=${newInvite.token}`;

      if (emailSent) {
        toast.success("Convite enviado por e-mail!", {
          action: {
            label: "Copiar link",
            onClick: () => {
              navigator.clipboard.writeText(inviteLink);
              toast.success("Link copiado!");
            },
          },
          duration: 8000,
        });
      } else {
        toast.success("Convite criado! (E-mail não pôde ser enviado)", {
          action: {
            label: "Copiar link",
            onClick: () => {
              navigator.clipboard.writeText(inviteLink);
              toast.success("Link copiado!");
            },
          },
          duration: 8000,
        });
      }

      setIsDialogOpen(false);
      inviteForm.reset();
      setShowEmailPreview(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.list(profile.company_id),
      });
    } catch (error) {
      logger.error("Error creating invite:", error);
      toast.error("Erro ao criar convite");
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/registro?convite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleResendEmail = async (convite: Invite) => {
    try {
      toast.loading("Reenviando email...", { id: "resend" });
      const roleName = getRoleLabel(convite.role);
      const emailSent = await sendInviteEmail(convite.email, convite.token, roleName);
      
      toast.dismiss("resend");
      if (emailSent) {
        toast.success(`E-mail reenviado para ${convite.email}`);
      } else {
        toast.error("Erro ao reenviar e-mail");
      }
    } catch (error) {
      toast.dismiss("resend");
      logger.error("Error resending email:", error);
      toast.error("Erro ao reenviar e-mail");
    }
  };

  const handleResendExpiredInvite = async (convite: Invite) => {
    try {
      toast.loading("Renovando e reenviando...", { id: "renew" });

      // Extend expiration by 7 days from now
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      await renewMutation.mutateAsync({
        inviteId: convite.id,
        newExpiresAt: newExpiry.toISOString(),
        companyId: convite.company_id,
      });

      const roleName = getRoleLabel(convite.role);
      await sendInviteEmail(convite.email, convite.token, roleName);

      toast.dismiss("renew");
      toast.success(`Convite renovado e reenviado para ${convite.email}`);
    } catch (error) {
      toast.dismiss("renew");
      logger.error("Error renewing invite:", error);
      toast.error("Erro ao renovar convite");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelMutation.mutateAsync({
        inviteId,
        companyId: profile?.company_id!,
      });

      toast.success("Convite cancelado");
    } catch (error) {
      logger.error("Error cancelling invite:", error);
      toast.error("Erro ao cancelar convite");
    }
  };

  const handleBatchCSVUpload = async (file: File) => {
    if (!profile?.company_id) return;
    setBatchProcessing(true);
    setBatchResults(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Skip header row if it looks like a header
      const startIndex = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      
      const rows = lines.slice(startIndex).map(line => {
        const parts = line.split(/[,;]/).map(p => p.trim().replace(/^"|"$/g, ""));
        return { email: parts[0], name: parts[1] || "", role: parts[2] || "colaborador" };
      }).filter(r => r.email && r.email.includes("@"));

      if (rows.length === 0) {
        toast.error("Nenhum e-mail válido encontrado no CSV");
        setBatchProcessing(false);
        return;
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          // Check for duplicates
          const existing = await checkDuplicateInvite(row.email, profile.company_id);

          if (existing) {
            errors.push(`${row.email}: já existe convite pendente`);
            failed++;
            continue;
          }

          const validRoles = ["admin", "colaborador", "financeiro", "gestor", "juridico"];
          const inviteRole = validRoles.includes(row.role.toLowerCase()) ? row.role.toLowerCase() : "colaborador";

          const newInvite = await createInvite({
            email: row.email,
            role: inviteRole,
            company_id: profile.company_id,
            invited_by: profile.user_id,
          });

          const roleName = getRoleLabel(inviteRole);
          await sendInviteEmail(row.email, newInvite.token, roleName);
          sent++;
        } catch {
          errors.push(`${row.email}: erro ao enviar`);
          failed++;
        }
      }

      setBatchResults({ sent, failed, errors });
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.list(profile.company_id),
      });
    } catch (error) {
      logger.error("Error processing CSV:", error);
      toast.error("Erro ao processar arquivo CSV");
    } finally {
      setBatchProcessing(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      financeiro: "Financeiro",
      juridico: "Jurídico",
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      accepted: "Aceito",
      pending: "Pendente",
      expired: "Expirado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const getStatusClassName = (status: string) => {
    if (status === "expired") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200";
    if (status === "accepted") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200";
    if (status === "pending") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200";
    if (status === "cancelled") return "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400";
    return "";
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const filteredConvites = useMemo(() => convites.filter((c) => {
    const matchesSearch = c.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const expired = isExpired(c.expires_at);
    const effectiveStatus = expired && c.status === "pending" ? "expired" : c.status;
    const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
    const matchesOnboarding = !onboardingFilter || (c.status === "accepted" && c.onboarding && c.onboarding.completionPercent < 100);
    return matchesSearch && matchesStatus && matchesOnboarding;
  }), [convites, debouncedSearchTerm, statusFilter, onboardingFilter]);

  const pendingCount = convites.filter(
    (c) => c.status === "pending" && !isExpired(c.expires_at)
  ).length;

  const conversionRate = convites.length > 0
    ? Math.round((convites.filter(c => c.status === "accepted").length / convites.length) * 100)
    : 0;

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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Convidar Colaborador</DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail para um novo colaborador
              </DialogDescription>
            </DialogHeader>
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(handleCreateInvite)} className="grid gap-4 py-4">
                <FormField
                  control={inviteForm.control}
                  name="inviteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Nome do colaborador (opcional)" {...field} />
                      </FormControl>
                      <FormDescription>Personaliza a saudação do e-mail de convite</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="colaborador@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perfil no sistema *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o perfil" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="juridico">Jurídico</SelectItem>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="colaborador">Colaborador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo na empresa</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Ex: Desenvolvedor Senior" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={inviteForm.control}
                    name="expiryDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validade do convite</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="3">3 dias</SelectItem>
                            <SelectItem value="7">7 dias</SelectItem>
                            <SelectItem value="14">14 dias</SelectItem>
                            <SelectItem value="30">30 dias</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {availableContracts.length > 0 && (
                    <FormField
                      control={inviteForm.control}
                      name="linkedContractId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vincular a Contrato</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Nenhum" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {availableContracts.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.job_title}{c.profile_name ? ` — ${c.profile_name}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <FormField
                  control={inviteForm.control}
                  name="customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Mensagem personalizada
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Adicione uma mensagem ao e-mail de convite (opcional)"
                          rows={2}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Preview */}
                {watchedInvite.email && watchedInvite.role && (
                  <div className="border-t pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground"
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                    >
                      <Eye className="h-4 w-4" />
                      {showEmailPreview ? "Ocultar preview" : "Preview do e-mail"}
                    </Button>
                    {showEmailPreview && generateEmailPreviewHtml && (
                      <div className="mt-3 border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                        <div
                          className="bg-white"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(generateEmailPreviewHtml) }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); inviteForm.reset(); setShowEmailPreview(false); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={inviteForm.formState.isSubmitting}>
                    {inviteForm.formState.isSubmitting ? "Enviando..." : "Enviar Convite"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        <Dialog open={isBatchDialogOpen} onOpenChange={(open) => { setIsBatchDialogOpen(open); if (!open) setBatchResults(null); }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Importar Convites via CSV</DialogTitle>
              <DialogDescription>
                Envie múltiplos convites de uma só vez importando um arquivo CSV
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Formato esperado do CSV:</p>
                <code className="text-xs block bg-background rounded p-2 font-mono">email,nome,cargo<br/>joao@email.com,João Silva,colaborador<br/>maria@email.com,Maria Santos,gestor</code>
                <p className="text-xs text-muted-foreground">Cargos válidos: admin, colaborador, financeiro, gestor, juridico</p>
                <Button
                  variant="link"
                  size="sm"
                  className="gap-1.5 p-0 h-auto text-xs"
                  onClick={() => {
                    const csv = "email,nome,cargo\ncolaborador@email.com,Nome Completo,colaborador";
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "modelo_convites.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Baixar modelo CSV
                </Button>
              </div>

              {!batchProcessing && !batchResults && (
                <div className="space-y-2">
                  <Label>Arquivo CSV</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBatchCSVUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {batchProcessing && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processando convites...</p>
                </div>
              )}

              {batchResults && (
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1 text-center rounded-lg border p-3">
                      <div className="text-2xl font-bold text-green-600">{batchResults.sent}</div>
                      <p className="text-xs text-muted-foreground">Enviados</p>
                    </div>
                    <div className="flex-1 text-center rounded-lg border p-3">
                      <div className="text-2xl font-bold text-red-600">{batchResults.failed}</div>
                      <p className="text-xs text-muted-foreground">Falharam</p>
                    </div>
                  </div>
                  {batchResults.errors.length > 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 max-h-[120px] overflow-y-auto">
                      <p className="text-xs font-medium text-destructive mb-1">Erros:</p>
                      {batchResults.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive/80">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsBatchDialogOpen(false); setBatchResults(null); }}>
                {batchResults ? "Fechar" : "Cancelar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Convites aceitos</p>
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
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="accepted">Aceito</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={onboardingFilter ? "default" : "outline"}
              size="sm"
              onClick={() => setOnboardingFilter(!onboardingFilter)}
              className="gap-1.5 text-xs"
            >
              <Filter className="h-3 w-3" />
              Onboarding incompleto
            </Button>
            {(statusFilter !== "all" || onboardingFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatusFilter("all"); setOnboardingFilter(false); }}
                className="text-muted-foreground text-xs"
              >
                Limpar filtros
              </Button>
            )}
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
                          <span className={`text-sm ${expired ? 'text-red-500 dark:text-red-400 line-through' : 'text-muted-foreground'}`}>
                            {format(new Date(convite.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              <Badge variant="outline" className={getStatusClassName(status)}>
                                {getStatusLabel(status)}
                              </Badge>
                            </div>
                            {status === "accepted" && convite.onboarding && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-default">
                                    <Progress value={convite.onboarding.completionPercent} className="h-1.5 w-20" />
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                      {convite.onboarding.completionPercent}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  <p className="font-medium mb-1">Onboarding:</p>
                                  <ul className="space-y-0.5">
                                    <li>{convite.onboarding.hasPassword ? "✅" : "⬜"} Senha criada</li>
                                    <li>{convite.onboarding.hasPersonalData ? "✅" : "⬜"} Dados pessoais</li>
                                    <li>{convite.onboarding.hasFiscalData ? "✅" : "⬜"} Dados fiscais (PJ)</li>
                                    <li>{convite.onboarding.hasAddress ? "✅" : "⬜"} Endereço</li>
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendEmail(convite)}
                                  className="h-8 gap-1 text-xs"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Reenviar
                                </Button>
                                {(() => {
                                  const daysLeft = Math.ceil((new Date(convite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                  return daysLeft <= 3 && daysLeft > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleExtendValidade(convite)}
                                          className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700"
                                        >
                                          <CalendarPlus className="h-3 w-3" />
                                          +7 dias
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Estender validade por mais 7 dias (expira em {daysLeft} dia{daysLeft > 1 ? 's' : ''})</TooltipContent>
                                    </Tooltip>
                                  ) : null;
                                })()}
                              </>
                            )}
                            {status === "expired" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendExpiredInvite(convite)}
                                className="h-8 gap-1 text-xs text-amber-600 hover:text-amber-700"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Renovar
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {(status === "pending" || status === "expired") && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleCopyLink(convite.token)}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Copiar link
                                    </DropdownMenuItem>
                                    {status === "pending" && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleExtendValidade(convite)}>
                                          <CalendarPlus className="mr-2 h-4 w-4" />
                                          Estender Validade (+7 dias)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleCancelInvite(convite.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Cancelar
                                        </DropdownMenuItem>
                                      </>                                    )}
                                  </>
                                )}
                                {status !== "pending" && status !== "expired" && (
                                  <DropdownMenuItem disabled>
                                    Nenhuma ação disponível
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
