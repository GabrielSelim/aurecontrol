import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Trash2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface DeletionRequest {
  id: string;
  user_id: string;
  requester_email: string;
  reason: string | null;
  status: "pending" | "in_review" | "completed" | "rejected";
  rejection_reason: string | null;
  anonymized_at: string | null;
  created_at: string;
  // For master admin view
  profile?: { full_name: string; email: string };
}

const STATUS_CONFIG = {
  pending:   { label: "Aguardando",    variant: "outline" as const,     icon: Clock },
  in_review: { label: "Em Revisão",    variant: "secondary" as const,   icon: AlertCircle },
  completed: { label: "Concluído",     variant: "default" as const,     icon: CheckCircle },
  rejected:  { label: "Rejeitado",     variant: "destructive" as const, icon: XCircle },
};

const LGPD = () => {
  useDocumentTitle("Privacidade e LGPD");
  const { user, profile, hasRole } = useAuth();
  const isMasterAdmin = hasRole("master_admin");

  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anonymizeId, setAnonymizeId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadRequests();
  }, [user]);

  const loadRequests = async () => {
    try {
      const query = supabase
        .from("lgpd_deletion_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = isMasterAdmin
        ? await query
        : await query.eq("user_id", user!.id);

      if (error) throw error;
      setRequests((data ?? []) as DeletionRequest[]);
    } catch (err) {
      logger.error("LGPD loadRequests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!user || !profile?.email) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("lgpd_deletion_requests").insert([{
        user_id: user.id,
        requester_email: profile.email,
        reason: reason.trim() || null,
        status: "pending",
      }]);
      if (error) throw error;
      toast.success("Solicitação enviada com sucesso.");
      setRequestDialogOpen(false);
      setReason("");
      await loadRequests();
    } catch (err) {
      logger.error("LGPD submit:", err);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "in_review" | "rejected") => {
    try {
      const { error } = await supabase
        .from("lgpd_deletion_requests")
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Solicitação marcada como: ${STATUS_CONFIG[status].label}`);
      await loadRequests();
    } catch (err) {
      logger.error("LGPD updateStatus:", err);
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleAnonymize = async () => {
    if (!anonymizeId) return;
    const req = requests.find(r => r.id === anonymizeId);
    if (!req) return;
    try {
      const { error } = await supabase.rpc("anonymize_user_data", { p_user_id: req.user_id });
      if (error) throw error;
      toast.success("Dados anonimizados com sucesso conforme LGPD.");
      setAnonymizeId(null);
      await loadRequests();
    } catch (err) {
      logger.error("LGPD anonymize:", err);
      toast.error("Erro ao anonimizar dados.");
    }
  };

  const myPendingRequest = !isMasterAdmin && requests.find(r =>
    r.user_id === user?.id && ["pending", "in_review"].includes(r.status)
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Privacidade e LGPD
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie seus dados pessoais conforme a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
        </p>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seus Direitos (Art. 18 LGPD)</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            ["Acesso", "Confirmar existência de tratamento e acessar seus dados."],
            ["Correção", "Corrigir dados incompletos, inexatos ou desatualizados."],
            ["Portabilidade", "Receber seus dados em formato estruturado."],
            ["Eliminação", "Solicitar exclusão dos dados tratados com seu consentimento."],
            ["Revogação", "Revogar consentimento a qualquer momento."],
            ["Informação", "Ser informado sobre entidades públicas e privadas com que compartilhamos dados."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-2">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* For regular users: request deletion */}
      {!isMasterAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              Solicitar Exclusão de Dados
            </CardTitle>
            <CardDescription>
              Ao solicitar a exclusão, seus dados pessoais serão anonimizados após revisão da equipe.
              Contratos em vigor podem impedir a exclusão imediata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myPendingRequest ? (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Você já tem uma solicitação em aberto ({STATUS_CONFIG[myPendingRequest.status].label})
                </p>
                <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                  Enviada em {format(new Date(myPendingRequest.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setRequestDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Solicitar Exclusão dos Meus Dados
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* History / Admin view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isMasterAdmin ? "Solicitações de Exclusão — Todas as Empresas" : "Minhas Solicitações"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma solicitação registrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isMasterAdmin && <TableHead>Usuário</TableHead>}
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  {isMasterAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(req => {
                  const cfg = STATUS_CONFIG[req.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={req.id}>
                      {isMasterAdmin && (
                        <TableCell className="text-sm">{req.requester_email}</TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(req.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {req.reason || <span className="text-muted-foreground italic">Não informado</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      {isMasterAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {req.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(req.id, "in_review")}
                              >
                                Revisar
                              </Button>
                            )}
                            {req.status === "in_review" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setAnonymizeId(req.id)}
                                >
                                  Anonimizar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(req.id, "rejected")}
                                >
                                  Rejeitar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Exclusão de Dados</DialogTitle>
            <DialogDescription>
              Informe o motivo da solicitação (opcional). Nossa equipe entrará em contato em até 15 dias úteis.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: desejo encerrar minha conta e remover todos os meus dados pessoais..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSubmitRequest} disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Confirmar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anonymize Confirmation */}
      <AlertDialog open={!!anonymizeId} onOpenChange={open => !open && setAnonymizeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Anonimização?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os dados pessoais do usuário (nome, CPF, endereço,
              dados bancários, etc.) serão sobrescritos com dados anônimos. Contratos e registros de
              auditoria terão o nome/email substituídos. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnonymize} className="bg-red-600 hover:bg-red-700">
              Anonimizar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LGPD;
