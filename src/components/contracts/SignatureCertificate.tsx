import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Download, CheckCircle, Clock } from "lucide-react";

interface SignatureRecord {
  id: string;
  signer_type: string;
  signer_name: string;
  signer_email: string;
  signer_document?: string | null;
  signed_at: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  signature_image_url?: string | null;
}

interface SignatureCertificateProps {
  contractTitle: string;
  companyName: string;
  contractorName: string;
  documentId: string;
  completedAt: string | null;
  signatures: SignatureRecord[];
}

const getSignerTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    contractor: "Contratado(a)",
    company_representative: "Representante da Empresa",
    witness: "Testemunha",
  };
  return labels[type] || type;
};

const generateDocumentHash = (documentId: string, signatures: SignatureRecord[]) => {
  const data = `${documentId}-${signatures.map(s => `${s.id}:${s.signed_at}`).join("-")}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(12, "0").toUpperCase();
};

export const SignatureCertificate = ({
  contractTitle,
  companyName,
  contractorName,
  documentId,
  completedAt,
  signatures,
}: SignatureCertificateProps) => {
  const allSigned = signatures.every(s => s.signed_at);
  const documentHash = generateDocumentHash(documentId, signatures);

  const handleDownloadCertificate = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificado de Assinatura - ${contractTitle}</title>
        <style>
          @page { size: A4; margin: 25mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 40px; }
          .header { text-align: center; border-bottom: 3px solid #0f3460; padding-bottom: 24px; margin-bottom: 32px; }
          .header h1 { font-size: 22px; margin: 0 0 4px; color: #0f3460; letter-spacing: 2px; text-transform: uppercase; }
          .header p { font-size: 13px; color: #555; margin: 0; }
          .shield { display: inline-block; width: 48px; height: 48px; background: #0f3460; border-radius: 50%; margin-bottom: 12px; line-height: 48px; color: white; font-size: 24px; text-align: center; }
          .section { margin-bottom: 28px; }
          .section h2 { font-size: 15px; color: #0f3460; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
          .info-grid { display: grid; grid-template-columns: 160px 1fr; gap: 8px 16px; font-size: 13px; }
          .info-label { color: #666; font-weight: 600; }
          .info-value { color: #1a1a2e; }
          .signature-block { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #fafafa; }
          .signature-block.signed { border-color: #22c55e; background: #f0fdf4; }
          .sig-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .sig-name { font-weight: 700; font-size: 14px; }
          .sig-status { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
          .sig-status.signed { background: #dcfce7; color: #166534; }
          .sig-status.pending { background: #fef3c7; color: #92400e; }
          .sig-details { font-size: 12px; color: #555; line-height: 1.8; }
          .sig-image { max-width: 180px; max-height: 60px; margin-top: 8px; border: 1px solid #eee; border-radius: 4px; padding: 4px; background: white; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #0f3460; text-align: center; font-size: 11px; color: #888; }
          .hash { font-family: 'Courier New', monospace; font-size: 13px; color: #0f3460; background: #eef2ff; padding: 8px 16px; border-radius: 6px; display: inline-block; letter-spacing: 2px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shield">🛡</div>
          <h1>Certificado de Assinatura Eletrônica</h1>
          <p>Documento gerado eletronicamente com registro de autenticidade</p>
        </div>

        <div class="section">
          <h2>Dados do Contrato</h2>
          <div class="info-grid">
            <span class="info-label">Título/Cargo:</span>
            <span class="info-value">${contractTitle}</span>
            <span class="info-label">Empresa:</span>
            <span class="info-value">${companyName}</span>
            <span class="info-label">Contratado(a):</span>
            <span class="info-value">${contractorName}</span>
            <span class="info-label">ID do Documento:</span>
            <span class="info-value" style="font-family: monospace; font-size: 11px;">${documentId}</span>
            <span class="info-label">Status:</span>
            <span class="info-value">${allSigned ? "✅ Totalmente Assinado" : "⏳ Assinaturas Pendentes"}</span>
            ${completedAt ? `
              <span class="info-label">Concluído em:</span>
              <span class="info-value">${format(new Date(completedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
            ` : ""}
          </div>
        </div>

        <div class="section">
          <h2>Registro de Assinaturas</h2>
          ${signatures.map((s, i) => `
            <div class="signature-block ${s.signed_at ? "signed" : ""}">
              <div class="sig-header">
                <div>
                  <div class="sig-name">${i + 1}. ${s.signer_name}</div>
                  <div style="font-size: 12px; color: #666;">${getSignerTypeLabel(s.signer_type)}</div>
                </div>
                <span class="sig-status ${s.signed_at ? "signed" : "pending"}">
                  ${s.signed_at ? "ASSINADO" : "PENDENTE"}
                </span>
              </div>
              <div class="sig-details">
                <strong>E-mail:</strong> ${s.signer_email}<br/>
                ${s.signer_document ? `<strong>Documento:</strong> ${s.signer_document}<br/>` : ""}
                ${s.signed_at ? `
                  <strong>Data/Hora:</strong> ${format(new Date(s.signed_at), "dd/MM/yyyy 'às' HH:mm:ss zzz", { locale: ptBR })}<br/>
                  <strong>Timestamp UTC:</strong> ${new Date(s.signed_at).toISOString()}<br/>
                  ${s.ip_address ? `<strong>Endereço IP:</strong> ${s.ip_address}<br/>` : ""}
                  ${s.user_agent ? `<strong>Navegador:</strong> ${s.user_agent.substring(0, 100)}${s.user_agent.length > 100 ? "..." : ""}<br/>` : ""}
                ` : `
                  <span style="color: #92400e;">Aguardando assinatura</span>
                `}
              </div>
              ${s.signed_at && s.signature_image_url ? `
                <img class="sig-image" src="${s.signature_image_url}" alt="Assinatura de ${s.signer_name}" />
              ` : ""}
            </div>
          `).join("")}
        </div>

        <div class="footer">
          <p style="margin-bottom: 8px;"><strong>Hash de Verificação:</strong></p>
          <div class="hash">${documentHash}</div>
          <p style="margin-top: 16px;">
            Este certificado atesta que as assinaturas foram coletadas eletronicamente com registro de 
            data/hora (timestamp), endereço IP e identificação do navegador do signatário.
          </p>
          <p>
            Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
          </p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Certificado de Assinatura
          </CardTitle>
          <Badge variant={allSigned ? "default" : "outline"} className={allSigned ? "bg-green-500" : ""}>
            {allSigned ? (
              <><CheckCircle className="mr-1 h-3 w-3" /> Completo</>
            ) : (
              <><Clock className="mr-1 h-3 w-3" /> Pendente</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Hash:</strong> <code className="bg-muted px-1 rounded">{documentHash}</code></p>
          <p><strong>Assinaturas:</strong> {signatures.filter(s => s.signed_at).length}/{signatures.length}</p>
          {completedAt && (
            <p><strong>Concluído:</strong> {format(new Date(completedAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
          )}
        </div>

        <div className="space-y-2">
          {signatures.map((s) => (
            <div key={s.id} className={`flex items-center gap-2 text-xs p-2 rounded ${s.signed_at ? "bg-green-500/10" : "bg-muted/50"}`}>
              {s.signed_at ? (
                <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
              ) : (
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{s.signer_name}</p>
                {s.signed_at && (
                  <p className="text-muted-foreground">
                    {format(new Date(s.signed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadCertificate}>
          <Download className="mr-2 h-4 w-4" />
          Baixar Certificado
        </Button>
      </CardContent>
    </Card>
  );
};
