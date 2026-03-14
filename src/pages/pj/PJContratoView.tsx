import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchContract,
  fetchContractDocument,
  fetchSignaturesByDocument,
} from "@/services/contractService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { sanitizeHtml } from "@/lib/sanitize";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { logger } from "@/lib/logger";
import {
  ArrowLeft,
  Download,
  FileText,
  Check,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PJContratoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [contract, setContract] = useState<any>(null);
  const [document, setDocument] = useState<any>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useDocumentTitle(contract ? `Contrato — ${contract.job_title}` : "Contrato — Aure");

  const loadData = async () => {
    if (!id) return;
    try {
      setLoadError(false);
      const [contractData, docData] = await Promise.all([
        fetchContract(id),
        fetchContractDocument(id),
      ]);
      setContract(contractData);
      setDocument(docData);
      if (docData?.id) {
        const sigs = await fetchSignaturesByDocument(docData.id);
        setSignatures(sigs);
      }
    } catch (err) {
      logger.error("PJContratoView load error:", err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Inject HTML into iframe for isolated rendering
  useEffect(() => {
    if (!document?.document_html || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Georgia, serif;
            font-size: 13px;
            line-height: 1.7;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 32px 48px;
            max-width: 800px;
          }
          h1, h2, h3 { font-family: Arial, sans-serif; }
          p { margin: 0 0 10px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
        </style>
      </head>
      <body>${sanitizeHtml(document.document_html)}</body>
      </html>
    `);
    iframeDoc.close();
  }, [document]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  const getSignatureStatus = () => {
    if (signatures.length === 0) return null;
    const allSigned = signatures.every((s) => s.signed_at);
    return allSigned ? "signed" : "pending";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Erro ao carregar contrato" onRetry={loadData} />;
  }

  if (!document) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate("/pj/contratos")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">Documento ainda não gerado</h2>
            <p className="text-muted-foreground text-sm mt-2 text-center max-w-sm">
              O documento do contrato ainda não foi gerado pela empresa.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sigStatus = getSignatureStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/pj/contratos")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{contract?.job_title}</h1>
            <p className="text-sm text-muted-foreground">Visualização do contrato</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sigStatus === "signed" && (
            <Badge className="bg-green-500/10 text-green-700 border-green-200">
              <ShieldCheck className="mr-1 h-3 w-3" /> Totalmente assinado
            </Badge>
          )}
          {sigStatus === "pending" && (
            <Badge variant="outline">
              <Clock className="mr-1 h-3 w-3" /> Assinaturas pendentes
            </Badge>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" /> Baixar / Imprimir
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Document iframe — isolated rendering */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0 overflow-hidden rounded-lg">
            <iframe
              ref={iframeRef}
              title="Documento do Contrato"
              className="w-full border-0"
              style={{ height: "800px" }}
              sandbox="allow-same-origin allow-modals"
            />
          </CardContent>
        </Card>

        {/* Signatures sidebar */}
        {signatures.length > 0 && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Assinaturas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {signatures
                .sort((a, b) => a.signer_order - b.signer_order)
                .map((sig) => (
                  <div key={sig.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium capitalize">
                        {sig.signer_type === "company" ? "Empresa" : sig.signer_type === "contractor" ? "PJ" : "Testemunha"}
                      </span>
                      {sig.signed_at ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm font-medium">{sig.signer_name}</p>
                    <p className="text-xs text-muted-foreground">{sig.signer_email}</p>
                    {sig.signed_at && (
                      <p className="text-xs text-green-600">
                        ✓ {format(new Date(sig.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    {sig.signature_image_url && (
                      <img
                        src={sig.signature_image_url}
                        alt="Assinatura"
                        className="max-w-full h-auto border rounded mt-1"
                      />
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
