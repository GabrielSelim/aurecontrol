import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Upload, FileText, Trash2, Eye, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface PJDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
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
  pending:  { label: "Aguardando revisão", variant: "outline" as const, icon: Clock, color: "text-amber-600" },
  approved: { label: "Aprovado",           variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
  rejected: { label: "Rejeitado",          variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const PJDocumentos = () => {
  useDocumentTitle("Meus Documentos — Aure");
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<PJDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("pj_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDocuments((data ?? []) as PJDocument[]);
    } catch (err) {
      logger.error("PJDocumentos load:", err);
      toast({ title: "Erro ao carregar documentos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Tipo de arquivo não permitido", description: "Use PDF, JPG, PNG ou WEBP", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Limite: 10 MB", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile || !selectedType) {
      toast({ title: "Selecione o tipo e o arquivo", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${selectedType}_${Date.now()}.${ext}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from("pj-documents")
        .upload(path, selectedFile, { upsert: false, contentType: selectedFile.type });
      if (storageError) throw storageError;

      // Insert metadata
      const { error: dbError } = await supabase.from("pj_documents").insert([{
        user_id: user.id,
        document_type: selectedType,
        file_name: selectedFile.name,
        file_path: path,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        status: "pending",
      }]);
      if (dbError) {
        // Rollback storage
        await supabase.storage.from("pj-documents").remove([path]);
        throw dbError;
      }

      toast({ title: "Documento enviado com sucesso!", description: "Aguarde a revisão pela empresa." });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedType("");
      await loadDocuments();
    } catch (err) {
      logger.error("PJDocumentos upload:", err);
      toast({ title: "Erro ao enviar documento", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async (doc: PJDocument) => {
    try {
      const { data } = await supabase.storage
        .from("pj-documents")
        .createSignedUrl(doc.file_path, 60);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (err) {
      logger.error("PJDocumentos view:", err);
      toast({ title: "Erro ao abrir documento", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const doc = documents.find(d => d.id === deleteId);
    if (!doc) return;
    try {
      await supabase.storage.from("pj-documents").remove([doc.file_path]);
      const { error } = await supabase.from("pj_documents").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Documento removido" });
      setDeleteId(null);
      await loadDocuments();
    } catch (err) {
      logger.error("PJDocumentos delete:", err);
      toast({ title: "Erro ao remover documento", variant: "destructive" });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Documentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envie RG, CNPJ, comprovante de endereço e outros documentos exigidos pela empresa.
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Enviar Documento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["pending", "approved", "rejected"] as const).map(status => {
          const count = documents.filter(d => d.status === status).length;
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <Card key={status}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-1">Nenhum documento enviado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clique em "Enviar Documento" para adicionar seu primeiro documento.
              </p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          documents.map(doc => {
            const cfg = STATUS_CONFIG[doc.status];
            const Icon = cfg.icon;
            return (
              <Card key={doc.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 p-2 rounded-lg bg-muted shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                          {doc.file_size ? ` • ${formatBytes(doc.file_size)}` : ""}
                          {" • "}{format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        {doc.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            Motivo: {doc.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={cfg.variant} className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleView(doc)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {doc.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(doc.id)}
                          title="Remover"
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>
              Formatos aceitos: PDF, JPG, PNG, WEBP. Tamanho máximo: 10 MB.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo de documento</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Arquivo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar o arquivo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setSelectedFile(null); setSelectedType(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !selectedType}>
              {isUploading ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PJDocumentos;
