import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/services/edgeFunctionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Eye, CheckCircle, XCircle, Clock, Search, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface PJDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  // joined
  requester_email?: string;
  requester_name?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  rg: "RG",
  cpf: "CPF",
  cnpj_card: "Cartão CNPJ",
  proof_of_address: "Comprovante de Endereço",
  bank_statement: "Comprovante Bancário",
  social_contract: "Contrato Social",
  other: "Outro",
};

const STATUS_CONFIG = {
  pending:  { label: "Aguardando",  variant: "outline" as const,     icon: Clock,        color: "text-amber-600" },
  approved: { label: "Aprovado",    variant: "default" as const,     icon: CheckCircle,  color: "text-green-600" },
  rejected: { label: "Rejeitado",   variant: "destructive" as const, icon: XCircle,      color: "text-red-600" },
};

const DocumentosPJRevisao = () => {
  useDocumentTitle("Revisão de Documentos PJ");
  const { profile } = useAuth();

  const [documents, setDocuments] = useState<PJDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Reject dialog state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  // Approve confirm
  const [approveId, setApproveId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) loadDocuments();
  }, [profile]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      // Get all PJ users from this company
      const { data: pjUsers, error: usersErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("company_id", profile!.company_id!);

      if (usersErr) throw usersErr;

      const userIds = (pjUsers ?? []).map((u: any) => u.user_id);
      if (userIds.length === 0) {
        setDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from("pj_documents")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userMap = new Map((pjUsers ?? []).map((u: any) => [u.user_id, u]));
      const docs = (data ?? []).map((d: any) => {
        const u = userMap.get(d.user_id) as any;
        return {
          ...d,
          requester_email: u?.email ?? "",
          requester_name: u?.full_name ?? "—",
        } as PJDocument;
      });

      setDocuments(docs);
    } catch (err) {
      logger.error("DocumentosPJRevisao load:", err);
      toast.error("Erro ao carregar documentos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (doc: PJDocument) => {
    try {
      const { data } = await supabase.storage
        .from("pj-documents")
        .createSignedUrl(doc.file_path, 60);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (err) {
      toast.error("Erro ao abrir arquivo");
    }
  };

  const handleApprove = async () => {
    if (!approveId) return;
    const doc = documents.find((d) => d.id === approveId)!;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("pj_documents")
        .update({
          status: "approved",
          reviewed_by: profile!.user_id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", approveId);
      if (error) throw error;

      // Notify PJ user
      if (doc.requester_email) {
        await sendEmail({
          to: doc.requester_email,
          subject: "Seu documento foi aprovado — Aure",
          html: `<p>Olá, <strong>${doc.requester_name}</strong>!</p>
<p>Seu documento <strong>${DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}</strong> foi <span style="color:#16a34a"><strong>aprovado</strong></span>.</p>
<p>Atenciosamente,<br/>Equipe Aure</p>`,
        }).catch(() => {/* ignore email errors */});
      }

      toast.success("Documento aprovado com sucesso!");
      setApproveId(null);
      await loadDocuments();
    } catch (err) {
      logger.error("approve doc:", err);
      toast.error("Erro ao aprovar documento");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    const doc = documents.find((d) => d.id === rejectId)!;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("pj_documents")
        .update({
          status: "rejected",
          rejection_reason: rejectReason.trim(),
          reviewed_by: profile!.user_id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", rejectId);
      if (error) throw error;

      // Notify PJ user
      if (doc.requester_email) {
        await sendEmail({
          to: doc.requester_email,
          subject: "Documento não aceito — Aure",
          html: `<p>Olá, <strong>${doc.requester_name}</strong>!</p>
<p>Seu documento <strong>${DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}</strong> foi <span style="color:#dc2626"><strong>recusado</strong></span>.</p>
<p><strong>Motivo:</strong> ${rejectReason.trim()}</p>
<p>Por favor, acesse o portal e envie uma nova versão corrigida.</p>
<p>Atenciosamente,<br/>Equipe Aure</p>`,
        }).catch(() => {/* ignore email errors */});
      }

      toast.success("Documento rejeitado.");
      setRejectId(null);
      setRejectReason("");
      await loadDocuments();
    } catch (err) {
      logger.error("reject doc:", err);
      toast.error("Erro ao rejeitar documento");
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = documents.filter((d) => {
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesSearch =
      !debouncedSearch ||
      d.requester_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      d.requester_email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (DOCUMENT_TYPE_LABELS[d.document_type] ?? d.document_type)
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = {
    pending: documents.filter((d) => d.status === "pending").length,
    approved: documents.filter((d) => d.status === "approved").length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Documentos PJ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revise e aprove os documentos enviados pelos prestadores de serviço.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["pending", "approved", "rejected"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <Card
              key={s}
              className={`cursor-pointer transition-colors ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{counts[s]}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou tipo…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {documents.length === 0
                  ? "Nenhum documento enviado pelos prestadores."
                  : "Nenhum documento corresponde ao filtro."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prestador</TableHead>
                  <TableHead>Tipo de Documento</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => {
                  const cfg = STATUS_CONFIG[doc.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{doc.requester_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.requester_email}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[160px]">{doc.file_name}</p>
                        {doc.file_size && (
                          <p className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge
                            variant={cfg.variant}
                            className="flex items-center gap-1 w-fit"
                          >
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                          {doc.rejection_reason && (
                            <p className="text-xs text-red-500 mt-1 max-w-[140px] truncate" title={doc.rejection_reason}>
                              {doc.rejection_reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(doc)}
                            title="Visualizar arquivo"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setApproveId(doc.id)}
                                title="Aprovar"
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setRejectId(doc.id); setRejectReason(""); }}
                                title="Rejeitar"
                                className="text-red-500 hover:text-red-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation */}
      <AlertDialog open={!!approveId} onOpenChange={(open) => !open && setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O prestador será notificado por email que seu documento foi aprovado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Rejeitar Documento
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O prestador será notificado por email.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: documento ilegível, fora da validade, informações incorretas…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {isProcessing ? "Rejeitando…" : "Rejeitar e Notificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentosPJRevisao;
