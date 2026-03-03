import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  fetchSignatureByToken,
  fetchContractDocumentById,
  fetchContract,
  recordSignature,
  checkAllSignaturesCompleted,
  updateDocumentStatus,
} from "@/services/contractService";
import { fetchProfileByUserIdMaybe } from "@/services/profileService";
import { fetchCompanyName } from "@/services/companyService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  FileSignature,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { logger } from "@/lib/logger";
import { logAuditAction } from "@/lib/auditLog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface SignatureData {
  id: string;
  signer_name: string;
  signer_email: string;
  signed_at: string | null;
  document_id: string;
}

interface ContractInfo {
  job_title: string;
  contractor_name: string;
  company_name: string;
}

const AssinarContrato = () => {
  useDocumentTitle("Assinar Contrato");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();
  
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (token) {
      fetchSignatureData();
    } else {
      setError("Link de assinatura inválido");
      setIsLoading(false);
    }
  }, [token]);

  const fetchSignatureData = async () => {
    try {
      // Fetch signature by token
      const sigData = await fetchSignatureByToken(token!);

      if (!sigData) {
        setError("Link de assinatura inválido ou expirado");
        setIsLoading(false);
        return;
      }

      if (sigData.signed_at) {
        setSignature(sigData);
        setSuccess(true);
        setIsLoading(false);
        return;
      }

      setSignature(sigData);

      // Fetch contract info
      const docData = await fetchContractDocumentById(sigData.document_id);

      if (docData) {
        setContractId(docData.contract_id);
        const contractData = await fetchContract(docData.contract_id);

        if (contractData) {
          const [profileData, companyName] = await Promise.all([
            fetchProfileByUserIdMaybe(contractData.user_id, "full_name"),
            fetchCompanyName(contractData.company_id),
          ]);

          setContractInfo({
            job_title: contractData.job_title,
            contractor_name: profileData?.full_name || "N/A",
            company_name: companyName || "N/A",
          });
        }
      }
    } catch (error) {
      logger.error("Error fetching signature data:", error);
      setError("Erro ao carregar dados da assinatura");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSignature = () => {
    signatureRef.current?.clear();
  };

  const handleSign = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({
        title: "Erro",
        description: "Por favor, desenhe sua assinatura antes de assinar",
        variant: "destructive",
      });
      return;
    }

    if (!signature) return;

    setIsSigning(true);
    try {
      const signatureImage = signatureRef.current.toDataURL("image/png");

      // Try to get real IP
      let ipAddress = "browser";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip || "browser";
      } catch { /* fallback */ }

      // Update the signature record
      await recordSignature(
        signature.id,
        signatureImage,
        ipAddress,
        navigator.userAgent,
        token ?? undefined
      );

      // Check if all signatures are complete
      const allSigned = await checkAllSignaturesCompleted(signature.document_id);

      if (allSigned) {
        // Update document status to completed
        await updateDocumentStatus(
          signature.document_id,
          "completed",
          new Date().toISOString()
        );
      } else {
        // Update to partial
        await updateDocumentStatus(signature.document_id, "partial");
      }

      // Log audit action for the signature
      if (contractId) {
        logAuditAction({
          contractId,
          documentId: signature.document_id,
          action: allSigned ? "contract_completed" : "signature_completed",
          actorName: signature.signer_name,
          actorEmail: signature.signer_email,
          details: {
            signerName: signature.signer_name,
            signerEmail: signature.signer_email,
            signedVia: "external_link",
            allSigned,
            ipAddress,
          },
        });
      }

      setSuccess(true);
      toast({
        title: "Sucesso",
        description: "Contrato assinado com sucesso!",
      });
    } catch (error) {
      logger.error("Error signing contract:", error);
      toast({
        title: "Erro",
        description: "Não foi possível assinar o contrato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Se você acredita que isso é um erro, entre em contato com o administrador do contrato.
            </p>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Contrato Assinado!</CardTitle>
            <CardDescription>
              Sua assinatura foi registrada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="p-4 rounded-lg bg-muted/50 mb-4">
              <p className="text-sm text-muted-foreground">Assinado como</p>
              <p className="font-medium">{signature?.signer_name}</p>
              <p className="text-sm text-muted-foreground">{signature?.signer_email}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Você pode fechar esta página. Uma cópia do contrato será enviada para seu email quando todas as partes assinarem.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileSignature className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Assinar Contrato</CardTitle>
          <CardDescription>
            Você foi convidado a assinar como testemunha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contract Info */}
          {contractInfo && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Contratado:</span>
                <span className="text-sm font-medium">{contractInfo.contractor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Empresa:</span>
                <span className="text-sm font-medium">{contractInfo.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cargo:</span>
                <span className="text-sm font-medium">{contractInfo.job_title}</span>
              </div>
            </div>
          )}

          {/* Signer Info */}
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Assinando como:</p>
            <p className="font-medium">{signature?.signer_name}</p>
            <p className="text-sm text-muted-foreground">{signature?.signer_email}</p>
          </div>

          {/* Signature Pad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Sua Assinatura</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSignature}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
            <div className="border rounded-lg bg-white overflow-hidden">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-48 cursor-crosshair",
                  style: { width: "100%", height: "192px" },
                }}
                backgroundColor="white"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Desenhe sua assinatura no campo acima
            </p>
          </div>

          {/* Legal Notice */}
          <p className="text-xs text-muted-foreground text-center">
            Ao assinar, você declara que está de acordo com os termos do contrato
            e que sua assinatura eletrônica tem validade legal.
          </p>

          {/* Sign Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSign}
            disabled={isSigning}
          >
            {isSigning ? "Assinando..." : "Assinar Contrato"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssinarContrato;
