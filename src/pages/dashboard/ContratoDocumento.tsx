import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchContract,
  fetchContractDocument,
  fetchSignaturesByDocument,
  checkSignatureStorageAvailable,
  uploadSignatureImage,
  recordSignature,
  updateDocumentStatus,
  updateContractStatus,
  checkAllSignaturesCompleted,
} from "@/services/contractService";
import { fetchCompanyName } from "@/services/companyService";
import { fetchProfileByUserIdMaybe } from "@/services/profileService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  FileText,
  Check,
  Clock,
  AlertCircle,
  Pen,
  Move,
  Send,
  Shield,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignaturePad } from "@/components/contracts/SignaturePad";
import { SignaturePositionEditor } from "@/components/contracts/SignaturePositionEditor";
import { SignatureCertificate } from "@/components/contracts/SignatureCertificate";
import { ContractAuditTrail } from "@/components/contracts/ContractAuditTrail";
import { logAuditAction } from "@/lib/auditLog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/handleApiError";
import { sanitizeHtml } from "@/lib/sanitize";

interface ContractDocument {
  id: string;
  contract_id: string;
  document_html: string;
  witness_count: number;
  signature_status: string;
  completed_at: string | null;
  created_at: string;
}

interface ContractSignature {
  id: string;
  document_id: string;
  signer_type: string;
  signer_order: number;
  signer_user_id: string | null;
  signer_name: string;
  signer_email: string;
  signer_document: string | null;
  signed_at: string | null;
  signature_image_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  position_x: number;
  position_y: number;
  position_page: number;
  position_width: number;
  position_height: number;
}

interface Contract {
  id: string;
  job_title: string;
  contract_type: string;
  salary: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  company_id: string;
  user_id: string;
}

const ContratoDocumento = () => {
  useDocumentTitle("Documento do Contrato");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user, roles } = useAuth();
  const [document, setDocument] = useState<ContractDocument | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signingAs, setSigningAs] = useState<ContractSignature | null>(null);
  const [activeTab, setActiveTab] = useState<string>("documento");
  const [companyName, setCompanyName] = useState("");
  const [contractorName, setContractorName] = useState("");
  
  const isAdmin = roles?.some(r => r.role === "admin" || r.role === "master_admin");

  useEffect(() => {
    if (id) {
      fetchDocumentData();
    }
  }, [id]);

  const fetchDocumentData = async () => {
    setLoadError(false);
    setIsLoading(true);
    try {
      // Fetch contract
      const contractData = await fetchContract(id!);
      if (!contractData) {
        toast.error("Contrato não encontrado");
        navigate("/dashboard/contratos");
        return;
      }

      setContract(contractData);

      // Fetch company and contractor names
      const [companyNameResult, profileResult] = await Promise.all([
        fetchCompanyName(contractData.company_id).catch(() => null),
        fetchProfileByUserIdMaybe(contractData.user_id, "full_name"),
      ]);
      setCompanyName(companyNameResult || "N/A");
      setContractorName(profileResult?.full_name || "N/A");

      // Fetch document
      const docData = await fetchContractDocument(id!);

      if (docData) {
        setDocument(docData);

        // Fetch signatures
        const sigData = await fetchSignaturesByDocument(docData.id);
        setSignatures(sigData);
      }
    } catch (error) {
      logger.error("Error fetching document:", error);
      toast.error("Erro ao carregar documento");
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = (signature: ContractSignature) => {
    setSigningAs(signature);
    setSignatureDialogOpen(true);
  };

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!signingAs || !document) return;

    try {
      // Get real IP address
      let ipAddress = "browser";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip || "browser";
      } catch { /* fallback */ }

      // Upload signature image to storage
      const fileName = `signatures/${document.id}/${signingAs.id}.png`;
      const base64Data = signatureDataUrl.split(",")[1];
      const binaryData = atob(base64Data);
      const arrayBuffer = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        arrayBuffer[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([arrayBuffer], { type: "image/png" });

      // Check if bucket exists
      const storageAvailable = await checkSignatureStorageAvailable();
      
      if (!storageAvailable) {
        // We'll store as base64 URL for now since bucket creation requires admin
        await recordSignature(signingAs.id, signatureDataUrl, ipAddress, navigator.userAgent);
      } else {
        const publicUrl = await uploadSignatureImage(fileName, blob);
        await recordSignature(signingAs.id, publicUrl, ipAddress, navigator.userAgent);
      }

      // Check if all signatures are complete
      const allSigned = await checkAllSignaturesCompleted(document.id);
      
      if (allSigned) {
        await updateDocumentStatus(document.id, "completed", new Date().toISOString());

        // Update contract status to "assinado"
        if (contract) {
          await updateContractStatus(contract.id, "assinado");
        }
      } else {
        await updateDocumentStatus(document.id, "partial");
      }

      // Log audit
      await logAuditAction({
        contractId: contract!.id,
        documentId: document.id,
        action: allSigned ? "contract_completed" : "signature_completed",
        actorName: signingAs.signer_name,
        actorEmail: signingAs.signer_email,
        details: {
          signerType: signingAs.signer_type,
          signerName: signingAs.signer_name,
          allSigned,
        },
      });

      toast.success("Assinatura registrada com sucesso!");
      setSignatureDialogOpen(false);
      setSigningAs(null);
      fetchDocumentData();
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao salvar assinatura"));
    }
  };

  const canSign = (signature: ContractSignature) => {
    if (signature.signed_at) return false;
    
    // Check if current user can sign this
    if (signature.signer_user_id === user?.id) return true;
    if (signature.signer_email === profile?.email) return true;
    
    return false;
  };

  const getSignerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contractor: "Contratado(a)",
      company_representative: "Representante da Empresa",
      witness: "Testemunha",
    };
    return labels[type] || type;
  };

  const getContractStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
      enviado: { label: "Enviado", variant: "secondary", icon: <Send className="mr-1 h-3 w-3" /> },
      assinado: { label: "Assinado", variant: "default", icon: <Check className="mr-1 h-3 w-3" /> },
      active: { label: "Vigente", variant: "default", icon: <Check className="mr-1 h-3 w-3" /> },
      terminated: { label: "Encerrado", variant: "destructive", icon: <AlertCircle className="mr-1 h-3 w-3" /> },
      inactive: { label: "Inativo", variant: "outline", icon: <Clock className="mr-1 h-3 w-3" /> },
    };
    const info = labels[status] || { label: status, variant: "outline" as const, icon: null };
    return <Badge variant={info.variant}>{info.icon}{info.label}</Badge>;
  };

  const getSignatureStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600"><Check className="mr-1 h-3 w-3" /> Totalmente Assinado</Badge>;
      case "partial":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Parcialmente Assinado</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" /> Pendente</Badge>;
    }
  };

  const handleSendForSignature = async () => {
    if (!contract || !document) return;
    try {
      await updateContractStatus(contract.id, "enviado");
      
      setContract({ ...contract, status: "enviado" });

      await logAuditAction({
        contractId: contract.id,
        documentId: document?.id,
        action: "contract_sent",
        actorName: profile?.full_name || "",
        actorEmail: profile?.email || "",
      });

      toast.success("Contrato enviado para assinatura!");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao enviar contrato");
    }
  };

  const handleDownloadPDF = () => {
    if (contract && document) {
      logAuditAction({
        contractId: contract.id,
        documentId: document.id,
        action: "pdf_downloaded",
        actorName: profile?.full_name || "",
        actorEmail: profile?.email || "",
      });
    }
    const printWindow = window.open("", "_blank");
    if (printWindow && document) {
      // Group signatures by page
      const signaturesByPage: Record<number, ContractSignature[]> = {};
      signatures.forEach(sig => {
        const page = sig.position_page || 1;
        if (!signaturesByPage[page]) signaturesByPage[page] = [];
        signaturesByPage[page].push(sig);
      });

      // Generate signature overlays for positioned signatures
      const generateSignatureOverlay = (sig: ContractSignature) => {
        const hasSignature = sig.signed_at && sig.signature_image_url;
        return `
          <div style="
            position: absolute;
            left: ${sig.position_x}%;
            top: ${sig.position_y}%;
            transform: translate(-50%, -50%);
            width: ${sig.position_width}px;
            height: ${sig.position_height}px;
            border: 1px dashed ${hasSignature ? '#22c55e' : '#9ca3af'};
            border-radius: 4px;
            padding: 4px;
            box-sizing: border-box;
            background: ${hasSignature ? 'rgba(34, 197, 94, 0.05)' : 'rgba(156, 163, 175, 0.05)'};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          ">
            ${hasSignature ? `
              <img src="${sig.signature_image_url}" alt="Assinatura" style="max-width: 90%; max-height: 50px; object-fit: contain;" />
              <div style="font-size: 8px; color: #666; margin-top: 2px;">${sig.signer_name}</div>
              <div style="font-size: 7px; color: #999;">${format(new Date(sig.signed_at!), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
            ` : `
              <div style="font-size: 9px; color: #999; text-align: center;">
                <div>${getSignerTypeLabel(sig.signer_type)}</div>
                <div style="font-size: 8px; margin-top: 2px;">${sig.signer_name}</div>
                <div style="font-size: 7px; color: #ccc; margin-top: 4px;">Pendente</div>
              </div>
            `}
          </div>
        `;
      };

      // Get all pages that have signatures
      const maxPage = Math.max(...signatures.map(s => s.position_page || 1), 1);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Contrato - ${contract?.job_title}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 0;
            }
            .page {
              position: relative;
              min-height: 100vh;
              padding: 40px;
              box-sizing: border-box;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: auto;
            }
            .document-content {
              position: relative;
            }
            .signatures-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
            }
            .signature-summary {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .signature-item {
              margin: 15px 0;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            img { max-width: 200px; height: auto; }
            @media print {
              .page { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="document-content">
              ${document.document_html}
            </div>
            <div class="signatures-overlay">
              ${(signaturesByPage[1] || []).map(generateSignatureOverlay).join('')}
            </div>
          </div>
          
          ${maxPage > 1 ? Array.from({ length: maxPage - 1 }, (_, i) => i + 2).map(page => `
            <div class="page">
              <div class="signatures-overlay" style="position: relative; height: 100vh;">
                ${(signaturesByPage[page] || []).map(generateSignatureOverlay).join('')}
              </div>
            </div>
          `).join('') : ''}
          
          <div class="signature-summary">
            <h3 style="margin-bottom: 20px;">Resumo das Assinaturas</h3>
            ${signatures.map(s => `
              <div class="signature-item">
                <p style="margin: 0 0 5px 0;"><strong>${getSignerTypeLabel(s.signer_type)}:</strong> ${s.signer_name}</p>
                <p style="margin: 0; font-size: 12px; color: #666;">Posição: Página ${s.position_page || 1}</p>
                ${s.signed_at ? `
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #22c55e;">
                    ✓ Assinado em: ${format(new Date(s.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                ` : `
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">⏳ Pendente</p>
                `}
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Erro ao carregar documento" onRetry={fetchDocumentData} />;
  }

  if (!document) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate(`/dashboard/contratos/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Contrato
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Documento não gerado</h2>
            <p className="text-muted-foreground text-center max-w-md">
              O documento do contrato ainda não foi gerado. Isso acontece automaticamente 
              para contratos PJ quando são criados com um template.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/dashboard/contratos/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documento do Contrato</h1>
            <p className="text-muted-foreground">{contract?.job_title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {contract && getContractStatusLabel(contract.status)}
          {getSignatureStatusBadge(document.signature_status)}
          {isAdmin && contract?.status !== "enviado" && contract?.status !== "assinado" && document.signature_status === "pending" && (
            <Button variant="outline" onClick={handleSendForSignature}>
              <Send className="mr-2 h-4 w-4" />
              Enviar para Assinatura
            </Button>
          )}
          <Button onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documento">
            <FileText className="h-4 w-4 mr-2" />
            Documento
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="posicionar">
              <Move className="h-4 w-4 mr-2" />
              Posicionar Assinaturas
            </TabsTrigger>
          )}
          <TabsTrigger value="certificado">
            <Shield className="h-4 w-4 mr-2" />
            Certificado
          </TabsTrigger>
          <TabsTrigger value="auditoria">
            <History className="h-4 w-4 mr-2" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documento" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Document */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div
                  className="prose prose-sm max-w-none bg-white text-black p-8 rounded-lg border"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(document.document_html) }}
                />
              </CardContent>
            </Card>

            {/* Signatures Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assinaturas</CardTitle>
                  <CardDescription>
                    Status das assinaturas do contrato
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bilateral Flow Indicator */}
                  {signatures.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fluxo de Assinatura</p>
                      <div className="flex items-center gap-1">
                        {signatures
                          .sort((a, b) => a.signer_order - b.signer_order)
                          .map((s, i) => (
                          <div key={s.id} className="flex items-center gap-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              s.signed_at ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              {s.signed_at ? <Check className="h-3 w-3" /> : i + 1}
                            </div>
                            {i < signatures.length - 1 && (
                              <div className={`w-6 h-0.5 ${s.signed_at ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Empresa</span>
                        <span>PJ</span>
                        {signatures.some(s => s.signer_type === "witness") && <span>Testemunhas</span>}
                      </div>
                    </div>
                  )}

                  {signatures.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma assinatura configurada
                    </p>
                  ) : (
                    signatures.map((signature) => (
                      <div
                        key={signature.id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {getSignerTypeLabel(signature.signer_type)}
                            {signature.signer_type === "witness" && ` ${signature.signer_order}`}
                          </span>
                          {signature.signed_at ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                              <Check className="mr-1 h-3 w-3" />
                              Assinado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </div>
                        <p className="text-sm">{signature.signer_name}</p>
                        <p className="text-xs text-muted-foreground">{signature.signer_email}</p>
                        
                        {signature.signed_at && (
                          <div className="mt-2 space-y-1">
                            {signature.signature_image_url && (
                              <img
                                src={signature.signature_image_url}
                                alt="Assinatura"
                                className="max-w-[150px] h-auto border rounded"
                              />
                            )}
                            <p className="text-xs text-muted-foreground">
                              📅 {format(new Date(signature.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              UTC: {new Date(signature.signed_at).toISOString()}
                            </p>
                            {signature.ip_address && (
                              <p className="text-[10px] text-muted-foreground">
                                🌐 IP: {signature.ip_address}
                              </p>
                            )}
                          </div>
                        )}

                        {canSign(signature) && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => handleSign(signature)}
                          >
                            <Pen className="mr-2 h-4 w-4" />
                            Assinar
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {document.completed_at && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Contrato Totalmente Assinado</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Concluído em {format(new Date(document.completed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="posicionar" className="mt-6">
            <SignaturePositionEditor
              documentHtml={document.document_html}
              signatures={signatures.map(s => ({
                id: s.id,
                signer_type: s.signer_type,
                signer_name: s.signer_name,
                signer_order: s.signer_order,
                position_x: s.position_x,
                position_y: s.position_y,
                position_page: s.position_page,
                position_width: s.position_width,
                position_height: s.position_height,
                signed_at: s.signed_at,
              }))}
              documentId={document.id}
              onPositionsUpdated={fetchDocumentData}
            />
          </TabsContent>
        )}

        <TabsContent value="certificado" className="mt-6">
          <SignatureCertificate
            contractTitle={contract?.job_title || ""}
            companyName={companyName}
            contractorName={contractorName}
            documentId={document.id}
            completedAt={document.completed_at}
            signatures={signatures.map(s => ({
              id: s.id,
              signer_type: s.signer_type,
              signer_name: s.signer_name,
              signer_email: s.signer_email,
              signer_document: s.signer_document,
              signed_at: s.signed_at,
              ip_address: s.ip_address,
              user_agent: s.user_agent,
              signature_image_url: s.signature_image_url,
            }))}
          />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-6">
          <ContractAuditTrail
            contractId={contract?.id || ""}
            documentId={document.id}
          />
        </TabsContent>
      </Tabs>

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assinar Contrato</DialogTitle>
            <DialogDescription>
              {signingAs && (
                <>
                  Assinando como: <strong>{signingAs.signer_name}</strong> ({getSignerTypeLabel(signingAs.signer_type)})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={() => {
              setSignatureDialogOpen(false);
              setSigningAs(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContratoDocumento;
