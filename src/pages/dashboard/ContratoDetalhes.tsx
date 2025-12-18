import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Building2,
  Target,
  FileSignature,
  Check,
  AlertCircle,
  Users,
  Pencil,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Contract {
  id: string;
  user_id: string;
  company_id: string;
  contract_type: string;
  job_title: string;
  department: string | null;
  salary: number | null;
  hourly_rate: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  document_url: string | null;
  duration_type: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  deliverable_description: string | null;
}

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface ContractDocument {
  id: string;
  signature_status: string;
  completed_at: string | null;
  witness_count: number;
}

interface ContractSignature {
  id: string;
  document_id: string;
  signer_type: string;
  signer_name: string;
  signer_email: string;
  signed_at: string | null;
  signing_token: string | null;
}

const ContratoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contract, setContract] = useState<Contract | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [document, setDocument] = useState<ContractDocument | null>(null);
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingWitness, setEditingWitness] = useState<ContractSignature | null>(null);
  const [witnessName, setWitnessName] = useState("");
  const [witnessEmail, setWitnessEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchContract();
    }
  }, [id]);

  const fetchContract = async () => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (contractError) throw contractError;
      if (!contractData) {
        navigate("/dashboard/contratos");
        return;
      }

      setContract(contractData);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("user_id", contractData.user_id)
        .maybeSingle();

      setProfile(profileData);

      // Fetch document if PJ contract
      if (contractData.contract_type === "PJ") {
        const { data: docData } = await supabase
          .from("contract_documents")
          .select("id, signature_status, completed_at, witness_count")
          .eq("contract_id", contractData.id)
          .maybeSingle();
        
        setDocument(docData);

        // Fetch signatures
        if (docData) {
          const { data: signaturesData } = await supabase
            .from("contract_signatures")
            .select("id, document_id, signer_type, signer_name, signer_email, signed_at, signing_token")
            .eq("document_id", docData.id)
            .order("signer_order");
          
          setSignatures(signaturesData || []);
        }
      }
    } catch (error) {
      console.error("Error fetching contract:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWitness = (witness: ContractSignature) => {
    setEditingWitness(witness);
    setWitnessName(witness.signer_name);
    setWitnessEmail(witness.signer_email);
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendWitnessNotificationEmail = async (name: string, email: string, signingToken: string | null) => {
    try {
      const contractorName = profile?.full_name || "Contratado";
      const baseUrl = window.location.origin;
      const signingLink = signingToken ? `${baseUrl}/assinar-contrato?token=${signingToken}` : null;
      
      await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: "Você foi adicionado como testemunha em um contrato - Aure System",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Olá ${name},</h2>
              <p>Você foi adicionado como <strong>testemunha</strong> em um contrato PJ no sistema Aure.</p>
              <p><strong>Contrato de:</strong> ${contractorName}</p>
              ${signingLink ? `
                <p>Clique no botão abaixo para assinar o contrato:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${signingLink}" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Assinar Contrato
                  </a>
                </div>
                <p style="color: #666; font-size: 12px;">Ou copie e cole este link no seu navegador:</p>
                <p style="color: #666; font-size: 12px; word-break: break-all;">${signingLink}</p>
              ` : `
                <p>Em breve você receberá instruções para assinar o documento.</p>
              `}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #666; font-size: 12px;">Este é um email automático do sistema Aure.</p>
            </div>
          `,
          from_name: "Aure System",
        },
      });
      console.log("Email notification sent to witness:", email);
    } catch (error) {
      console.error("Error sending witness notification email:", error);
      // Don't throw - email failure shouldn't block the main operation
    }
  };

  const handleSaveWitness = async () => {
    if (!editingWitness) return;
    
    if (!witnessName.trim() || !witnessEmail.trim()) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(witnessEmail.trim())) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("contract_signatures")
        .update({
          signer_name: witnessName.trim(),
          signer_email: witnessEmail.trim(),
        })
        .eq("id", editingWitness.id);

      if (error) throw error;

      // Fetch the updated signature with the signing token
      const { data: updatedSig } = await supabase
        .from("contract_signatures")
        .select("signing_token")
        .eq("id", editingWitness.id)
        .maybeSingle();

      // Send email notification to the witness with signing link
      await sendWitnessNotificationEmail(witnessName.trim(), witnessEmail.trim(), updatedSig?.signing_token || null);

      toast({
        title: "Sucesso",
        description: "Testemunha atualizada e notificada por email",
      });

      setEditingWitness(null);
      fetchContract();
    } catch (error) {
      console.error("Error updating witness:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a testemunha",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendSigningLink = async (witness: ContractSignature) => {
    if (!witness.signing_token) {
      toast({
        title: "Erro",
        description: "Token de assinatura não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(witness.id);
    try {
      await sendWitnessNotificationEmail(witness.signer_name, witness.signer_email, witness.signing_token);
      toast({
        title: "Sucesso",
        description: "Link de assinatura reenviado por email",
      });
    } catch (error) {
      console.error("Error resending signing link:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reenviar o email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(null);
    }
  };

  const getSignerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contractor: "Contratado",
      company_representative: "Representante da Empresa",
      witness: "Testemunha",
    };
    return labels[type] || type;
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CLT: "CLT",
      PJ: "PJ",
      estagio: "Estágio",
      temporario: "Temporário",
    };
    return labels[type] || type;
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      suspended: "secondary",
      terminated: "destructive",
      expired: "outline",
    };
    return variants[status] || "outline";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Ativo",
      suspended: "Suspenso",
      terminated: "Encerrado",
      expired: "Expirado",
    };
    return labels[status] || status;
  };

  const getDurationTypeLabel = (type: string | null) => {
    if (!type) return "Não definido";
    const labels: Record<string, string> = {
      indefinite: "Indeterminado",
      time_based: "Por Tempo",
      delivery_based: "Por Entrega",
    };
    return labels[type] || type;
  };

  const getDurationUnitLabel = (unit: string | null) => {
    if (!unit) return "";
    const labels: Record<string, string> = {
      days: "dias",
      weeks: "semanas",
      months: "meses",
      years: "anos",
    };
    return labels[unit] || unit;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getDocumentStatusBadge = () => {
    if (!document) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertCircle className="mr-1 h-3 w-3" />
          Documento não gerado
        </Badge>
      );
    }
    
    switch (document.signature_status) {
      case "completed":
        return (
          <Badge className="bg-green-500">
            <Check className="mr-1 h-3 w-3" />
            Totalmente Assinado
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Parcialmente Assinado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Pendente de Assinatura
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Contrato não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/contratos")} className="mt-4">
          Voltar para contratos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/contratos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Detalhes do Contrato</h1>
          <p className="text-muted-foreground">
            {profile?.full_name} • {getContractTypeLabel(contract.contract_type)}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(contract.status)} className="text-sm">
          {getStatusLabel(contract.status)}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Colaborador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{profile?.full_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email || "-"}</p>
            </div>
            {profile?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do Contrato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Informações do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant="outline">{getContractTypeLabel(contract.contract_type)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">{contract.job_title}</p>
              </div>
            </div>
            {contract.department && (
              <div>
                <p className="text-sm text-muted-foreground">Departamento</p>
                <p className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {contract.department}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {contract.salary && (
                <div>
                  <p className="text-sm text-muted-foreground">Salário</p>
                  <p className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {formatCurrency(contract.salary)}
                  </p>
                </div>
              )}
              {contract.hourly_rate && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor/Hora</p>
                  <p className="font-medium">{formatCurrency(contract.hourly_rate)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Datas e Duração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período e Duração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data de Início</p>
                <p className="font-medium">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Término</p>
                <p className="font-medium">{formatDate(contract.end_date)}</p>
              </div>
            </div>

            {contract.contract_type === "PJ" && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tipo de Duração</p>
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    <Clock className="h-3 w-3" />
                    {getDurationTypeLabel(contract.duration_type)}
                  </Badge>
                </div>

                {contract.duration_type === "time_based" && contract.duration_value && (
                  <div>
                    <p className="text-sm text-muted-foreground">Período Definido</p>
                    <p className="font-medium">
                      {contract.duration_value} {getDurationUnitLabel(contract.duration_unit)}
                    </p>
                  </div>
                )}

                {contract.duration_type === "delivery_based" && contract.deliverable_description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Entrega Esperada</p>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {contract.deliverable_description}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Documento Digital - Only for PJ */}
        {contract.contract_type === "PJ" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Documento Digital
              </CardTitle>
              <CardDescription>
                Contrato PJ com assinaturas digitais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getDocumentStatusBadge()}
              </div>
              
              {document?.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Concluído em</p>
                  <p className="font-medium">{formatDate(document.completed_at)}</p>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={() => navigate(`/dashboard/contratos/${id}/documento`)}
              >
                <FileSignature className="mr-2 h-4 w-4" />
                {document ? "Ver Documento e Assinaturas" : "Gerar Documento"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Testemunhas - Only for PJ contracts with witnesses */}
        {contract.contract_type === "PJ" && document && signatures.filter(s => s.signer_type === "witness").length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Testemunhas
              </CardTitle>
              <CardDescription>
                Gerencie as testemunhas do contrato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {signatures
                .filter(s => s.signer_type === "witness")
                .map((witness, index) => (
                  <div key={witness.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Testemunha {index + 1}</p>
                      <p className="font-medium">{witness.signer_name}</p>
                      <p className="text-sm text-muted-foreground">{witness.signer_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {witness.signed_at ? (
                        <Badge className="bg-green-500">
                          <Check className="mr-1 h-3 w-3" />
                          Assinado
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            Pendente
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResendSigningLink(witness)}
                            disabled={isSendingEmail === witness.id}
                            title="Reenviar link de assinatura"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditWitness(witness)}
                            title="Editar testemunha"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Criado em</p>
              <p className="font-medium">{formatDate(contract.created_at)}</p>
            </div>
            {contract.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="text-sm mt-1 p-3 bg-muted/50 rounded-lg">{contract.notes}</p>
              </div>
            )}
            {contract.document_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Documento</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={contract.document_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver documento
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para editar testemunha */}
      <Dialog open={!!editingWitness} onOpenChange={(open) => !open && setEditingWitness(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Testemunha</DialogTitle>
            <DialogDescription>
              Atualize os dados da testemunha pendente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="witnessName">Nome Completo</Label>
              <Input
                id="witnessName"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Nome da testemunha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="witnessEmail">Email</Label>
              <Input
                id="witnessEmail"
                type="email"
                value={witnessEmail}
                onChange={(e) => setWitnessEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className={witnessEmail && !isValidEmail(witnessEmail) ? "border-destructive" : ""}
              />
              {witnessEmail && !isValidEmail(witnessEmail) && (
                <p className="text-sm text-destructive">Email inválido</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWitness(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveWitness} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContratoDetalhes;
