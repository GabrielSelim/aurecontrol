import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignaturePad } from "@/components/contracts/SignaturePad";
import { SignaturePositionEditor } from "@/components/contracts/SignaturePositionEditor";

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
  position_x: number;
  position_y: number;
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
  company_id: string;
  user_id: string;
}

const ContratoDocumento = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user, roles } = useAuth();
  const [document, setDocument] = useState<ContractDocument | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signingAs, setSigningAs] = useState<ContractSignature | null>(null);
  const [activeTab, setActiveTab] = useState<string>("documento");
  
  const isAdmin = roles?.some(r => r.role === "admin" || r.role === "master_admin");

  useEffect(() => {
    if (id) {
      fetchDocumentData();
    }
  }, [id]);

  const fetchDocumentData = async () => {
    try {
      // Fetch contract
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (contractError) throw contractError;
      if (!contractData) {
        toast.error("Contrato não encontrado");
        navigate("/dashboard/contratos");
        return;
      }

      setContract(contractData);

      // Fetch document
      const { data: docData, error: docError } = await supabase
        .from("contract_documents")
        .select("*")
        .eq("contract_id", id)
        .maybeSingle();

      if (docError) throw docError;

      if (docData) {
        setDocument(docData);

        // Fetch signatures
        const { data: sigData, error: sigError } = await supabase
          .from("contract_signatures")
          .select("*")
          .eq("document_id", docData.id)
          .order("signer_order");

        if (sigError) throw sigError;
        setSignatures(sigData || []);
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      toast.error("Erro ao carregar documento");
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
      // Upload signature image to storage
      const fileName = `signatures/${document.id}/${signingAs.id}.png`;
      const base64Data = signatureDataUrl.split(",")[1];
      const binaryData = atob(base64Data);
      const arrayBuffer = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        arrayBuffer[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([arrayBuffer], { type: "image/png" });

      // Check if bucket exists, create if not
      const { data: buckets } = await supabase.storage.listBuckets();
      const signaturesBucket = buckets?.find(b => b.name === 'contract-signatures');
      
      if (!signaturesBucket) {
        // We'll store as base64 URL for now since bucket creation requires admin
        const { error: updateError } = await supabase
          .from("contract_signatures")
          .update({
            signed_at: new Date().toISOString(),
            signature_image_url: signatureDataUrl, // Store base64 directly
            ip_address: "browser",
            user_agent: navigator.userAgent,
          })
          .eq("id", signingAs.id);

        if (updateError) throw updateError;
      } else {
        const { error: uploadError } = await supabase.storage
          .from("contract-signatures")
          .upload(fileName, blob, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("contract-signatures")
          .getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from("contract_signatures")
          .update({
            signed_at: new Date().toISOString(),
            signature_image_url: urlData.publicUrl,
            ip_address: "browser",
            user_agent: navigator.userAgent,
          })
          .eq("id", signingAs.id);

        if (updateError) throw updateError;
      }

      // Check if all signatures are complete
      const updatedSignatures = signatures.map(s => 
        s.id === signingAs.id 
          ? { ...s, signed_at: new Date().toISOString(), signature_image_url: signatureDataUrl }
          : s
      );
      
      const allSigned = updatedSignatures.every(s => s.signed_at);
      
      if (allSigned) {
        await supabase
          .from("contract_documents")
          .update({
            signature_status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", document.id);
      } else {
        await supabase
          .from("contract_documents")
          .update({ signature_status: "partial" })
          .eq("id", document.id);
      }

      toast.success("Assinatura registrada com sucesso!");
      setSignatureDialogOpen(false);
      setSigningAs(null);
      fetchDocumentData();
    } catch (error: any) {
      console.error("Error saving signature:", error);
      toast.error(error?.message || "Erro ao salvar assinatura");
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
      contractor: "Contratado",
      company_representative: "Representante da Empresa",
      witness: "Testemunha",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><Check className="mr-1 h-3 w-3" /> Assinado</Badge>;
      case "partial":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Parcialmente Assinado</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" /> Pendente</Badge>;
    }
  };

  const handleDownloadPDF = () => {
    // For now, we'll use the browser's print functionality
    const printWindow = window.open("", "_blank");
    if (printWindow && document) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Contrato - ${contract?.job_title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .signature-line { margin-top: 10px; }
            img { max-width: 200px; height: auto; }
          </style>
        </head>
        <body>
          ${document.document_html}
          <div style="margin-top: 40px;">
            <h3>Assinaturas:</h3>
            ${signatures.map(s => `
              <div style="margin: 20px 0; padding: 10px; border: 1px solid #ddd;">
                <p><strong>${getSignerTypeLabel(s.signer_type)}:</strong> ${s.signer_name}</p>
                ${s.signature_image_url ? `<img src="${s.signature_image_url}" alt="Assinatura" />` : '<p style="color: #999;">Pendente</p>'}
                ${s.signed_at ? `<p style="font-size: 12px; color: #666;">Assinado em: ${format(new Date(s.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>` : ''}
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
        <div className="flex items-center gap-2">
          {getStatusBadge(document.signature_status)}
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
        </TabsList>

        <TabsContent value="documento" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Document */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div
                  className="prose prose-sm max-w-none bg-white text-black p-8 rounded-lg border"
                  dangerouslySetInnerHTML={{ __html: document.document_html }}
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
                        
                        {signature.signed_at && signature.signature_image_url && (
                          <div className="mt-2">
                            <img
                              src={signature.signature_image_url}
                              alt="Assinatura"
                              className="max-w-[150px] h-auto border rounded"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(signature.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
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
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Contrato Totalmente Assinado</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Concluído em {format(new Date(document.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
                position_width: s.position_width,
                position_height: s.position_height,
                signed_at: s.signed_at,
              }))}
              documentId={document.id}
              onPositionsUpdated={fetchDocumentData}
            />
          </TabsContent>
        )}
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