import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchContract as fetchContractService,
  fetchContractDocument as fetchContractDocumentService,
  fetchSignaturesByDocument,
  updateSignature,
  fetchSignatureToken,
  updateContractStatus,
  updateContractFields,
} from "@/services/contractService";
import { fetchProfileByUserIdMaybe } from "@/services/profileService";
import { sendEmail, gerarObrigacoesPJ } from "@/services/edgeFunctionService";
import { fetchCompanyFull } from "@/services/companyService";
import {
  fetchGoalsByContract,
  createGoal,
  updateGoalStatus,
  deleteGoal,
  type ContractGoal,
} from "@/services/goalService";
import {
  fetchContratoAnexos,
  uploadContratoAnexo,
  deleteContratoAnexo,
  getAnexoSignedUrl,
  type ContratoAnexo,
} from "@/services/contratoAnexosService";
import {
  fetchNfseByContract,
  createNfse,
  cancelNfse,
  fetchSplitsByContract,
  createContractSplit,
  deleteContractSplit,
  type NfseRecord,
  type ContractSplit,
  markNfseEmitida,
} from "@/services/nfseService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Upload,
  Trash2,
  Paperclip,
  Download,
  Receipt,
  Percent,
  PlusCircle,
  CheckCircle2,
  XCircle,
  ListTodo,
  Plus,
  History,
  CreditCard,
  Printer,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";
import { buildWitnessNotificationEmail } from "@/lib/emailTemplates";
import { logAuditAction } from "@/lib/auditLog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ContractAuditTrail } from "@/components/contracts/ContractAuditTrail";
import { HoleritoDigital } from "@/components/contracts/HoleritoDigital";
import { ContractStatusTimeline } from "@/components/contracts/ContractStatusTimeline";

interface Contract {
  id: string;
  user_id: string;
  company_id: string;
  contract_type: string;
  job_title: string;
  department: string | null;
  salary: number | null;
  hourly_rate: number | null;
  compensation_type: string | null;
  variable_component: number | null;
  goal_description: string | null;
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
  payment_frequency: string | null;
  payment_day: number | null;
  monthly_value: number | null;
  scope_description: string | null;
  adjustment_index: string | null;
  adjustment_date: string | null;
  clt_employee_id: string | null;
  clt_ctps_number: string | null;
  clt_ctps_series: string | null;
  clt_cbo_code: string | null;
  clt_work_regime: string | null;
  pis_pasep: string | null;
  esocial_categoria: string | null;
  grau_instrucao: string | null;
  raca_cor: string | null;
  estado_civil: string | null;
  data_admissao: string | null;
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
  useDocumentTitle("Detalhes do Contrato");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: authProfile, hasRole } = useAuth();
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
  const [attachments, setAttachments] = useState<ContratoAnexo[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nfseList, setNfseList] = useState<NfseRecord[]>([]);
  const [splits, setSplits] = useState<ContractSplit[]>([]);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [splitName, setSplitName] = useState("");
  const [splitDocument, setSplitDocument] = useState("");
  const [splitPercentage, setSplitPercentage] = useState("");
  const [isSavingSplit, setIsSavingSplit] = useState(false);
  const [documentHash, setDocumentHash] = useState<string | null>(null);
  // Goals state
  const [goals, setGoals] = useState<ContractGoal[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetValue, setGoalTargetValue] = useState("");
  const [goalDueDate, setGoalDueDate] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [reviewingGoal, setReviewingGoal] = useState<ContractGoal | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  // Holerite state
  const [isHoleritoOpen, setIsHoleritoOpen] = useState(false);
  const [holeritoMonth, setHoleritoMonth] = useState("");
  const [companyInfo, setCompanyInfo] = useState<{ name: string; cnpj?: string | null; address?: string | null } | null>(null);
  // CLT/eSocial edit state
  const [editingCLT, setEditingCLT] = useState(false);
  const [isSavingCLT, setIsSavingCLT] = useState(false);
  const [cltForm, setCltForm] = useState<{
    clt_employee_id: string; clt_ctps_number: string; clt_ctps_series: string;
    clt_cbo_code: string; clt_work_regime: string; pis_pasep: string;
    data_admissao: string; esocial_categoria: string; grau_instrucao: string;
    raca_cor: string; estado_civil: string;
  }>({
    clt_employee_id: "", clt_ctps_number: "", clt_ctps_series: "",
    clt_cbo_code: "", clt_work_regime: "", pis_pasep: "",
    data_admissao: "", esocial_categoria: "", grau_instrucao: "",
    raca_cor: "", estado_civil: "",
  });

  // Compute SHA-256 of document_html for integrity verification
  useEffect(() => {
    if (document?.signature_status === "completed" && document.document_html) {
      const computeHash = async () => {
        const encoder = new TextEncoder();
        const data = encoder.encode(document.document_html);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        setDocumentHash(hashArray.map(b => b.toString(16).padStart(2, "0")).join(""));
      };
      computeHash().catch(console.error);
    }
  }, [document]);

  useEffect(() => {
    if (id) {
      fetchContract();
    }
  }, [id]);

  const fetchContract = async () => {
    try {
      const contractData = await fetchContractService(id!);

      if (!contractData) {
        navigate("/dashboard/contratos");
        return;
      }

      setContract(contractData);
      loadAttachments(contractData.id);
      if (contractData.contract_type === "PJ") {
        loadNfse(contractData.id);
        loadSplits(contractData.id);
      }
      if (
        contractData.compensation_type === "variable_goal" ||
        contractData.compensation_type === "variable_deliverable" ||
        contractData.compensation_type === "mixed"
      ) {
        loadGoals(contractData.id);
      }
      const profileData = await fetchProfileByUserIdMaybe(
        contractData.user_id,
        "full_name, email, phone, avatar_url"
      );

      setProfile(profileData as unknown as Profile);

      // Fetch company info (for holerite)
      try {
        const company = await fetchCompanyFull(contractData.company_id);
        if (company) setCompanyInfo({ name: company.name, cnpj: company.cnpj, address: company.address });
      } catch {
        // Non-critical
      }

      // Fetch document if PJ contract
      if (contractData.contract_type === "PJ") {
        const docData = await fetchContractDocumentService(contractData.id);
        
        setDocument(docData);

        // Fetch signatures
        if (docData) {
          const signaturesData = await fetchSignaturesByDocument(docData.id);
          
          setSignatures(signaturesData || []);
        }
      }
    } catch (error) {
      logger.error("Error fetching contract:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do contrato.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttachments = async (contractId: string) => {
    try {
      const data = await fetchContratoAnexos(contractId);
      setAttachments(data);
    } catch (err) {
      logger.error("loadAttachments error:", err);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!contract || !authProfile) return;
    setIsUploadingAttachment(true);
    try {
      const anexo = await uploadContratoAnexo({
        contractId: contract.id,
        companyId: contract.company_id,
        uploadedBy: authProfile.user_id,
        file,
      });
      setAttachments((prev) => [anexo, ...prev]);
      toast({ title: "Anexo enviado com sucesso!" });
    } catch (err) {
      logger.error("handleUploadAttachment error:", err);
      toast({ title: "Erro ao enviar anexo", variant: "destructive" });
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (anexo: ContratoAnexo) => {
    try {
      await deleteContratoAnexo(anexo.id, anexo.file_path);
      setAttachments((prev) => prev.filter((a) => a.id !== anexo.id));
      toast({ title: "Anexo removido." });
    } catch (err) {
      logger.error("handleDeleteAttachment error:", err);
      toast({ title: "Erro ao remover anexo", variant: "destructive" });
    }
  };

  const handleDownloadAttachment = async (anexo: ContratoAnexo) => {
    try {
      const url = await getAnexoSignedUrl(anexo.file_path, 60);
      window.open(url, "_blank");
    } catch (err) {
      logger.error("handleDownloadAttachment error:", err);
      toast({ title: "Erro ao baixar anexo", variant: "destructive" });
    }
  };

  const loadNfse = async (contractId: string) => {
    try {
      const data = await fetchNfseByContract(contractId);
      setNfseList(data);
    } catch (err) {
      logger.error("loadNfse error:", err);
    }
  };

  const loadSplits = async (contractId: string) => {
    try {
      const data = await fetchSplitsByContract(contractId);
      setSplits(data);
    } catch (err) {
      logger.error("loadSplits error:", err);
    }
  };

  const loadGoals = async (contractId: string) => {
    try {
      const data = await fetchGoalsByContract(contractId);
      setGoals(data);
    } catch (err) {
      logger.error("loadGoals error:", err);
    }
  };

  const openCLTEdit = () => {
    if (!contract) return;
    setCltForm({
      clt_employee_id: contract.clt_employee_id ?? "",
      clt_ctps_number: contract.clt_ctps_number ?? "",
      clt_ctps_series: contract.clt_ctps_series ?? "",
      clt_cbo_code: contract.clt_cbo_code ?? "",
      clt_work_regime: contract.clt_work_regime ?? "",
      pis_pasep: contract.pis_pasep ?? "",
      data_admissao: contract.data_admissao ?? "",
      esocial_categoria: contract.esocial_categoria ?? "",
      grau_instrucao: contract.grau_instrucao ?? "",
      raca_cor: contract.raca_cor ?? "",
      estado_civil: contract.estado_civil ?? "",
    });
    setEditingCLT(true);
  };

  const saveCLTFields = async () => {
    if (!contract) return;
    setIsSavingCLT(true);
    try {
      const fields = Object.fromEntries(
        Object.entries(cltForm).map(([k, v]) => [k, v.trim() || null])
      );
      await updateContractFields(contract.id, fields);
      // Update local state
      setContract((prev) => prev ? { ...prev, ...fields } : prev);
      setEditingCLT(false);
      toast({ title: "Dados trabalhistas atualizados" });
    } catch (err) {
      logger.error("saveCLTFields:", err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSavingCLT(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!contract || !goalName.trim()) return;
    setIsSavingGoal(true);
    try {
      const newGoal = await createGoal({
        contract_id: contract.id,
        company_id: contract.company_id,
        name: goalName.trim(),
        description: goalDescription.trim() || null,
        target_value: goalTargetValue ? parseFloat(goalTargetValue.replace(/[^0-9,.]/g, "").replace(",", ".")) : null,
        due_date: goalDueDate || null,
        created_by: authProfile?.user_id ?? null,
      });
      setGoals((prev) => [newGoal, ...prev]);
      setIsGoalDialogOpen(false);
      setGoalName("");
      setGoalDescription("");
      setGoalTargetValue("");
      setGoalDueDate("");
      toast({ title: "Meta criada com sucesso!" });
    } catch (err) {
      logger.error("handleSaveGoal error:", err);
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleReviewGoal = async (newStatus: ContractGoal["status"]) => {
    if (!reviewingGoal || !authProfile) return;
    try {
      await updateGoalStatus(reviewingGoal.id, newStatus, authProfile.user_id, reviewNotes.trim() || undefined);
      setGoals((prev) =>
        prev.map((g) =>
          g.id === reviewingGoal.id
            ? { ...g, status: newStatus, reviewer_notes: reviewNotes.trim() || null, achieved_at: newStatus === "achieved" ? new Date().toISOString() : g.achieved_at }
            : g
        )
      );
      setReviewingGoal(null);
      setReviewNotes("");
      toast({ title: newStatus === "achieved" ? "Meta aprovada!" : newStatus === "rejected" ? "Meta rejeitada" : "Status atualizado" });
    } catch (err) {
      logger.error("handleReviewGoal error:", err);
      toast({ title: "Erro ao atualizar meta", variant: "destructive" });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      toast({ title: "Meta removida" });
    } catch (err) {
      logger.error("handleDeleteGoal error:", err);
    }
  };

  const handleEmitirNfse = async () => {
    if (!contract) return;
    try {
      const now = new Date();
      const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nfse = await createNfse({
        contractId: contract.id,
        companyId: contract.company_id,
        valor: contract.monthly_value ?? contract.salary ?? 0,
        competencia,
      });
      setNfseList((prev) => [nfse, ...prev]);
      toast({ title: "NFS-e registrada com sucesso!" });
    } catch (err) {
      logger.error("handleEmitirNfse error:", err);
      toast({ title: "Erro ao registrar NFS-e", variant: "destructive" });
    }
  };

  const handleCancelNfse = async (nfseId: string) => {
    try {
      await cancelNfse(nfseId);
      setNfseList((prev) => prev.map((n) => n.id === nfseId ? { ...n, status: "cancelada" as const } : n));
      toast({ title: "NFS-e cancelada." });
    } catch (err) {
      logger.error("handleCancelNfse error:", err);
      toast({ title: "Erro ao cancelar NFS-e", variant: "destructive" });
    }
  };

  const handleMarkNfseEmitida = async (nfseId: string) => {
    try {
      await markNfseEmitida(nfseId);
      setNfseList((prev) => prev.map((n) =>
        n.id === nfseId ? { ...n, status: "emitida" as const, emitida_em: new Date().toISOString() } : n
      ));
      toast({ title: "NFS-e marcada como emitida." });
    } catch (err) {
      logger.error("markNfseEmitida error:", err);
      toast({ title: "Erro ao atualizar NFS-e", variant: "destructive" });
    }
  };

  const handleSaveSplit = async () => {
    if (!contract || !splitName.trim() || !splitPercentage) return;
    const pct = parseFloat(splitPercentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast({ title: "Percentual inválido", variant: "destructive" });
      return;
    }
    const totalCurrent = splits.reduce((acc, s) => acc + s.percentage, 0);
    if (totalCurrent + pct > 100) {
      toast({ title: `Percentual total excederia 100% (atual: ${totalCurrent}%)`, variant: "destructive" });
      return;
    }
    setIsSavingSplit(true);
    try {
      const split = await createContractSplit({
        contractId: contract.id,
        beneficiaryName: splitName.trim(),
        beneficiaryDocument: splitDocument.trim() || undefined,
        percentage: pct,
      });
      setSplits((prev) => [...prev, split]);
      setSplitName("");
      setSplitDocument("");
      setSplitPercentage("");
      setIsSplitDialogOpen(false);
      toast({ title: "Split adicionado com sucesso!" });
    } catch (err) {
      logger.error("handleSaveSplit error:", err);
      toast({ title: "Erro ao salvar split", variant: "destructive" });
    } finally {
      setIsSavingSplit(false);
    }
  };

  const handleDeleteSplit = async (splitId: string) => {
    try {
      await deleteContractSplit(splitId);
      setSplits((prev) => prev.filter((s) => s.id !== splitId));
      toast({ title: "Split removido." });
    } catch (err) {
      logger.error("handleDeleteSplit error:", err);
      toast({ title: "Erro ao remover split", variant: "destructive" });
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

      const { subject, html } = buildWitnessNotificationEmail({
        recipientName: name,
        contractorName,
        signingLink,
      });

      await sendEmail({
        to: email,
        subject,
        html,
        from_name: "Aure System",
      });
    } catch (error) {
      logger.error("Error sending witness notification email:", error);
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
      await updateSignature(editingWitness.id, {
        signer_name: witnessName.trim(),
        signer_email: witnessEmail.trim(),
      });

      // Fetch the updated signature with the signing token
      const signingToken = await fetchSignatureToken(editingWitness.id);

      // Send email notification to the witness with signing link
      await sendWitnessNotificationEmail(witnessName.trim(), witnessEmail.trim(), signingToken);

      // Log audit: witness updated
      if (contract) {
        logAuditAction({
          contractId: contract.id,
          documentId: document?.id,
          action: "contract_updated",
          actorName: authProfile?.full_name || "Administrador",
          actorEmail: authProfile?.email || "",
          details: {
            field: "witness",
            witnessId: editingWitness.id,
            previousName: editingWitness.signer_name,
            previousEmail: editingWitness.signer_email,
            newName: witnessName.trim(),
            newEmail: witnessEmail.trim(),
          },
        });
      }

      toast({
        title: "Sucesso",
        description: "Testemunha atualizada e notificada por email",
      });

      setEditingWitness(null);
      fetchContract();
    } catch (error) {
      logger.error("Error updating witness:", error);
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
      logger.error("Error resending signing link:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reenviar o email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(null);
    }
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
      active: "Vigente",
      enviado: "Enviado",
      assinado: "Assinado",
      suspended: "Suspenso",
      em_revisao: "Em Revisão",
      renovado: "Renovado",
      terminated: "Encerrado",
      expired: "Expirado",
      inactive: "Inativo",
    };
    return labels[status] || status;
  };

  const getDaysUntilExpiry = () => {
    if (!contract?.end_date || contract.status !== "active") return null;
    const today = new Date();
    const endDate = new Date(contract.end_date);
    return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/contratos")} aria-label="Voltar para contratos">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Detalhes do Contrato</h1>
          <p className="text-muted-foreground">
            {profile?.full_name} • {getContractTypeLabel(contract.contract_type)}
          </p>
        </div>
        {(() => {
          const daysLeft = getDaysUntilExpiry();
          if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) {
            return (
              <Badge variant="outline" className="text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                Vencendo em {daysLeft}d
              </Badge>
            );
          }
          return (
            <Badge variant={getStatusBadgeVariant(contract.status)} className="text-sm">
              {getStatusLabel(contract.status)}
            </Badge>
          );
        })()}
        {/* Status Actions */}
        <div className="flex gap-2">
          {(contract.status === "active" || contract.status === "assinado") && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await updateContractStatus(contract.id, "em_revisao");
                window.location.reload();
              }}
            >
              Em Revisão
            </Button>
          )}
          {contract.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="text-slate-600 border-slate-400 hover:bg-slate-50"
              onClick={async () => {
                await updateContractStatus(contract.id, "suspended");
                window.location.reload();
              }}
            >
              Suspender
            </Button>
          )}
          {contract.status === "assinado" && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-500 hover:bg-green-50"
              onClick={async () => {
                await updateContractStatus(contract.id, "active");
                logAuditAction(contract.id, "contract_activated", "contract",
                  { previous_status: "assinado" }, "Contrato ativado pelo administrador");
                if (contract.contract_type === "PJ") {
                  const now = new Date();
                  gerarObrigacoesPJ(now.getFullYear(), now.getMonth() + 1).catch(() => {});
                }
                toast({ title: "Contrato ativado", description: "Status alterado para Vigente" + (contract.contract_type === "PJ" ? " e obrigações financeiras geradas." : ".") });
                window.location.reload();
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Ativar Contrato
            </Button>
          )}
          {(contract.status === "suspended" || contract.status === "em_revisao") && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-400 hover:bg-green-50"
              onClick={async () => {
                await updateContractStatus(contract.id, "active");
                if (contract.contract_type === "PJ") {
                  const now = new Date();
                  gerarObrigacoesPJ(now.getFullYear(), now.getMonth() + 1).catch(() => {});
                }
                window.location.reload();
              }}
            >
              Reativar
            </Button>
          )}
          {/* Holerite button — CLT/estágio/temporário only */}
          {contract.contract_type !== "PJ" && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setHoleritoMonth(new Date().toISOString().substring(0, 7));
                setIsHoleritoOpen(true);
              }}
            >
              <Printer className="h-4 w-4" />
              Holerite
            </Button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Ciclo de Vida do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractStatusTimeline
            status={contract.status}
            endDate={contract.end_date}
            createdAt={contract.created_at}
          />
        </CardContent>
      </Card>

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
                  <p className="text-sm text-muted-foreground">
                    {contract.compensation_type === "hourly" ? "Valor/Hora" :
                     contract.compensation_type === "variable_goal" ? "Valor da Meta" :
                     contract.compensation_type === "variable_deliverable" ? "Valor por Entregável" :
                     contract.compensation_type === "mixed" ? "Parte Fixa Mensal" :
                     "Salário"}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {formatCurrency(contract.salary)}
                    {contract.compensation_type === "hourly" && <span className="text-xs text-muted-foreground">/hora</span>}
                  </p>
                </div>
              )}
              {contract.hourly_rate && !contract.salary && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor/Hora</p>
                  <p className="font-medium">{formatCurrency(contract.hourly_rate)}</p>
                </div>
              )}
              {contract.compensation_type && contract.compensation_type !== "fixed" && (
                <div>
                  <p className="text-sm text-muted-foreground">Modelo de Remuneração</p>
                  <p className="font-medium">
                    {contract.compensation_type === "hourly" ? "Hora/Hora" :
                     contract.compensation_type === "variable_goal" ? "Variável por Meta" :
                     contract.compensation_type === "variable_deliverable" ? "Variável por Entregável" :
                     contract.compensation_type === "mixed" ? "Misto (Fixo + Variável)" :
                     contract.compensation_type}
                  </p>
                </div>
              )}
            </div>
            {contract.compensation_type === "mixed" && contract.variable_component && (
              <div>
                <p className="text-sm text-muted-foreground">Parte Variável (teto)</p>
                <p className="font-medium">{formatCurrency(contract.variable_component)}</p>
              </div>
            )}
            {contract.goal_description && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {contract.compensation_type === "variable_goal" ? "Descrição da Meta" : "Descrição do Entregável"}
                </p>
                <p className="text-sm">{contract.goal_description}</p>
              </div>
            )}
            {contract.contract_type === "PJ" && (contract.payment_frequency || contract.payment_day) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  {contract.payment_frequency && (
                    <div>
                      <p className="text-sm text-muted-foreground">Periodicidade</p>
                      <p className="font-medium capitalize">
                        {contract.payment_frequency === "monthly" ? "Mensal" :
                         contract.payment_frequency === "biweekly" ? "Quinzenal" :
                         contract.payment_frequency === "weekly" ? "Semanal" :
                         contract.payment_frequency === "per_delivery" ? "Por Entrega" :
                         contract.payment_frequency === "single" ? "Único" :
                         contract.payment_frequency}
                      </p>
                    </div>
                  )}
                  {contract.payment_day && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vencimento</p>
                      <p className="font-medium">Todo dia <strong>{contract.payment_day}</strong></p>
                    </div>
                  )}
                </div>
              </>
            )}
            {contract.scope_description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Escopo do Serviço</p>
                  <p className="text-sm whitespace-pre-line">{contract.scope_description}</p>
                </div>
              </>
            )}
            {contract.adjustment_index && contract.adjustment_index !== "none" && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Índice de Reajuste</p>
                    <p className="font-medium">{contract.adjustment_index}</p>
                  </div>
                  {contract.adjustment_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data-base do Reajuste</p>
                      <p className="font-medium">{formatDate(contract.adjustment_date)}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dados Trabalhistas CLT */}
        {contract.contract_type !== "PJ" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Dados Trabalhistas
              </CardTitle>
              {isAdmin() && !editingCLT && (
                <Button variant="outline" size="sm" onClick={openCLTEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editingCLT ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Matrícula</Label>
                      <Input value={cltForm.clt_employee_id} onChange={e => setCltForm(f => ({ ...f, clt_employee_id: e.target.value }))} placeholder="Ex: 00123" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Código CBO</Label>
                      <Input value={cltForm.clt_cbo_code} onChange={e => setCltForm(f => ({ ...f, clt_cbo_code: e.target.value }))} placeholder="Ex: 2521-05" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nº CTPS</Label>
                      <Input value={cltForm.clt_ctps_number} onChange={e => setCltForm(f => ({ ...f, clt_ctps_number: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Série CTPS</Label>
                      <Input value={cltForm.clt_ctps_series} onChange={e => setCltForm(f => ({ ...f, clt_ctps_series: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Regime de Trabalho</Label>
                      <Select value={cltForm.clt_work_regime} onValueChange={v => setCltForm(f => ({ ...f, clt_work_regime: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="teletrabalho">Teletrabalho (Home Office)</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                          <SelectItem value="parcial">Jornada Parcial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Estado Civil</Label>
                      <Select value={cltForm.estado_civil} onValueChange={v => setCltForm(f => ({ ...f, estado_civil: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                          <SelectItem value="casado">Casado(a)</SelectItem>
                          <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                          <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                          <SelectItem value="uniao_estavel">União Estável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados eSocial</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">PIS/PASEP</Label>
                      <Input value={cltForm.pis_pasep} onChange={e => setCltForm(f => ({ ...f, pis_pasep: e.target.value }))} placeholder="000.00000.00-0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Admissão</Label>
                      <Input type="date" value={cltForm.data_admissao} onChange={e => setCltForm(f => ({ ...f, data_admissao: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Categoria eSocial</Label>
                      <Input value={cltForm.esocial_categoria} onChange={e => setCltForm(f => ({ ...f, esocial_categoria: e.target.value }))} placeholder="Ex: 101" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Grau de Instrução</Label>
                      <Select value={cltForm.grau_instrucao} onValueChange={v => setCltForm(f => ({ ...f, grau_instrucao: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">Analfabeto</SelectItem>
                          <SelectItem value="02">Fundamental incompleto</SelectItem>
                          <SelectItem value="03">Fundamental completo</SelectItem>
                          <SelectItem value="04">Médio incompleto</SelectItem>
                          <SelectItem value="05">Médio completo</SelectItem>
                          <SelectItem value="06">Superior incompleto</SelectItem>
                          <SelectItem value="07">Superior completo</SelectItem>
                          <SelectItem value="08">Pós-graduação</SelectItem>
                          <SelectItem value="09">Mestrado</SelectItem>
                          <SelectItem value="10">Doutorado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Raça/Cor</Label>
                      <Select value={cltForm.raca_cor} onValueChange={v => setCltForm(f => ({ ...f, raca_cor: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Indígena</SelectItem>
                          <SelectItem value="2">Branca</SelectItem>
                          <SelectItem value="4">Preta</SelectItem>
                          <SelectItem value="6">Amarela</SelectItem>
                          <SelectItem value="8">Parda</SelectItem>
                          <SelectItem value="9">Não informado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={saveCLTFields} disabled={isSavingCLT}>
                      {isSavingCLT ? "Salvando…" : "Salvar"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingCLT(false)} disabled={isSavingCLT}>Cancelar</Button>
                  </div>
                </>
              ) : (
                <>
                  {(contract.clt_employee_id || contract.clt_ctps_number || contract.clt_cbo_code || contract.clt_work_regime) ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        {contract.clt_employee_id && <div><p className="text-sm text-muted-foreground">Matrícula</p><p className="font-medium">{contract.clt_employee_id}</p></div>}
                        {contract.clt_cbo_code && <div><p className="text-sm text-muted-foreground">Código CBO</p><p className="font-medium">{contract.clt_cbo_code}</p></div>}
                      </div>
                      {(contract.clt_ctps_number || contract.clt_ctps_series) && (
                        <><Separator />
                        <div className="grid grid-cols-2 gap-4">
                          {contract.clt_ctps_number && <div><p className="text-sm text-muted-foreground">Nº CTPS</p><p className="font-medium">{contract.clt_ctps_number}</p></div>}
                          {contract.clt_ctps_series && <div><p className="text-sm text-muted-foreground">Série CTPS</p><p className="font-medium">{contract.clt_ctps_series}</p></div>}
                        </div></>
                      )}
                      {contract.clt_work_regime && (
                        <><Separator />
                        <div><p className="text-sm text-muted-foreground">Regime de Trabalho</p>
                          <Badge variant="secondary">{{presencial:"Presencial",teletrabalho:"Teletrabalho",hibrido:"Híbrido",parcial:"Jornada Parcial"}[contract.clt_work_regime] || contract.clt_work_regime}</Badge>
                        </div></>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum dado trabalhista cadastrado. Use Editar para preencher.</p>
                  )}
                  {(contract.pis_pasep || contract.esocial_categoria || contract.grau_instrucao || contract.raca_cor || contract.estado_civil || contract.data_admissao) && (
                    <>
                      <Separator />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados eSocial</p>
                      <div className="grid grid-cols-2 gap-4">
                        {contract.pis_pasep && <div><p className="text-sm text-muted-foreground">PIS/PASEP</p><p className="font-medium font-mono">{contract.pis_pasep}</p></div>}
                        {contract.data_admissao && <div><p className="text-sm text-muted-foreground">Data de Admissão</p><p className="font-medium">{new Date(contract.data_admissao).toLocaleDateString("pt-BR")}</p></div>}
                        {contract.esocial_categoria && <div><p className="text-sm text-muted-foreground">Categoria eSocial</p><p className="font-medium">{contract.esocial_categoria}</p></div>}
                        {contract.estado_civil && <div><p className="text-sm text-muted-foreground">Estado Civil</p><p className="font-medium capitalize">{contract.estado_civil.replace("_"," ")}</p></div>}
                        {contract.grau_instrucao && <div><p className="text-sm text-muted-foreground">Grau de Instrução</p><p className="font-medium">{{"01":"Analfabeto","02":"Fund. incompleto","03":"Fund. completo","04":"Médio incompleto","05":"Médio completo","06":"Superior incompleto","07":"Superior completo","08":"Pós-graduação","09":"Mestrado","10":"Doutorado"}[contract.grau_instrucao]||contract.grau_instrucao}</p></div>}
                        {contract.raca_cor && <div><p className="text-sm text-muted-foreground">Raça/Cor</p><p className="font-medium">{{"1":"Indígena","2":"Branca","4":"Preta","6":"Amarela","8":"Parda","9":"Não informado"}[contract.raca_cor]||contract.raca_cor}</p></div>}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

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

              {documentHash && (
                <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <span>🔒</span> Hash de Integridade (SHA-256)
                  </p>
                  <p className="text-xs font-mono break-all text-foreground select-all">{documentHash}</p>
                  <p className="text-xs text-muted-foreground">Gerado a partir do conteúdo do documento assinado. Use para verificar autenticidade.</p>
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

      {/* Alerta de reajuste */}
      {contract?.adjustment_index && contract?.adjustment_date && (() => {
        const adjustmentDate = new Date(contract.adjustment_date);
        const today = new Date();
        const daysUntil = Math.ceil((adjustmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 60) return null;
        return (
          <div className={`flex items-start gap-3 rounded-lg border p-4 ${daysUntil <= 0 ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"}`}>
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                {daysUntil <= 0
                  ? "Reajuste em atraso"
                  : `Revisão de reajuste em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`}
              </p>
              <p className="text-xs mt-0.5">
                Índice: <strong>{contract.adjustment_index}</strong> — Previsto para{" "}
                {adjustmentDate.toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Anexos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Anexos ({attachments.length})
          </CardTitle>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadAttachment(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isUploadingAttachment}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploadingAttachment ? "Enviando..." : "Adicionar Arquivo"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum anexo adicionado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((anexo) => (
                <div
                  key={anexo.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{anexo.name}</p>
                      {anexo.description && (
                        <p className="text-xs text-muted-foreground truncate">{anexo.description}</p>
                      )}
                      {anexo.file_size && (
                        <p className="text-xs text-muted-foreground">
                          {(anexo.file_size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownloadAttachment(anexo)}
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAttachment(anexo)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NFS-e section (PJ only) */}
      {contract?.contract_type === "PJ" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              NFS-e — Notas Fiscais de Serviço ({nfseList.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleEmitirNfse}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Registrar NFS-e
            </Button>
          </CardHeader>
          <CardContent>
            {nfseList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma NFS-e registrada para este contrato.
              </p>
            ) : (
              <div className="space-y-2">
                {nfseList.map((nfse) => (
                  <div key={nfse.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Competência: {new Date(nfse.competencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                        {nfse.numero && ` · Nº ${nfse.numero}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Valor: {formatCurrency(nfse.valor)} ·{" "}
                        <span className={nfse.status === "emitida" ? "text-green-600" : nfse.status === "cancelada" ? "text-red-500" : nfse.status === "erro" ? "text-red-600" : "text-yellow-600"}>
                          {nfse.status.charAt(0).toUpperCase() + nfse.status.slice(1)}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {nfse.pdf_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(nfse.pdf_url!, "_blank")}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {nfse.status === "pendente" && (hasRole("master_admin") || hasRole("admin") || hasRole("financeiro")) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 dark:text-green-400"
                          title="Marcar como emitida (admin)"
                          onClick={() => handleMarkNfseEmitida(nfse.id)}
                        >
                          <FileCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {nfse.status === "emitida" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleCancelNfse(nfse.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Split section (PJ only) */}
      {contract?.contract_type === "PJ" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Configuração de Split
              </CardTitle>
              {splits.length > 0 && (
                <CardDescription className="mt-1">
                  Total alocado: {splits.reduce((acc, s) => acc + s.percentage, 0).toFixed(1)}%
                </CardDescription>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsSplitDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Beneficiário
            </Button>
          </CardHeader>
          <CardContent>
            {splits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma configuração de split. O pagamento integral vai ao contratado.
              </p>
            ) : (
              <div className="space-y-2">
                {splits.map((split) => (
                  <div key={split.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{split.beneficiary_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {split.beneficiary_document && `${split.beneficiary_document} · `}
                        {split.percentage}%
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteSplit(split.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metas e Entregáveis (for variable compensation contracts) */}
      {contract && (contract.compensation_type === "variable_goal" || contract.compensation_type === "variable_deliverable" || contract.compensation_type === "mixed") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodo className="h-4 w-4" />
                {contract.compensation_type === "variable_deliverable" ? "Entregáveis" : "Metas"}
              </CardTitle>
              <CardDescription>
                {contract.compensation_type === "variable_deliverable"
                  ? "Registre entregáveis e libere pagamentos ao aprovar conclusão"
                  : "Gerencie metas e libere pagamentos ao atingir cada objetivo"}
              </CardDescription>
            </div>
            {(hasRole("master_admin") || hasRole("admin") || hasRole("financeiro")) && (
              <Button variant="outline" size="sm" onClick={() => setIsGoalDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {contract.compensation_type === "variable_deliverable" ? "Entregável" : "Meta"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma {contract.compensation_type === "variable_deliverable" ? "entregável" : "meta"} cadastrada
              </p>
            ) : (
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div key={goal.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{goal.name}</p>
                          <Badge
                            variant="outline"
                            className={
                              goal.status === "achieved"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200"
                                : goal.status === "rejected"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200"
                                : goal.status === "partial"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200"
                            }
                          >
                            {goal.status === "achieved" ? "Atingida" : goal.status === "rejected" ? "Rejeitada" : goal.status === "partial" ? "Parcial" : "Pendente"}
                          </Badge>
                        </div>
                        {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {goal.target_value && (
                            <span className="font-medium text-foreground">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(goal.target_value)}
                            </span>
                          )}
                          {goal.due_date && <span>Prazo: {format(new Date(goal.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>}
                          {goal.achieved_at && <span>Atingida em: {format(new Date(goal.achieved_at), "dd/MM/yyyy", { locale: ptBR })}</span>}
                        </div>
                        {goal.reviewer_notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{goal.reviewer_notes}"</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {goal.status === "pending" && (hasRole("master_admin") || hasRole("admin") || hasRole("financeiro")) && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => { setReviewingGoal(goal); setReviewNotes(""); }}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setReviewingGoal({ ...goal, status: "rejected" }); setReviewNotes(""); }}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(hasRole("master_admin") || hasRole("admin")) && goal.status === "pending" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGoal(goal.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de Auditoria */}
      <ContractAuditTrail contractId={id!} />

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

      {/* Dialog para adicionar split */}
      <Dialog open={isSplitDialogOpen} onOpenChange={(open) => { setIsSplitDialogOpen(open); if (!open) { setSplitName(""); setSplitDocument(""); setSplitPercentage(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Beneficiário de Split</DialogTitle>
            <DialogDescription>
              Configure um beneficiário para receber parte do pagamento deste contrato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="split-name">Nome do Beneficiário *</Label>
              <Input
                id="split-name"
                value={splitName}
                onChange={(e) => setSplitName(e.target.value)}
                placeholder="Ex: Sócio João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="split-doc">CPF / CNPJ</Label>
              <Input
                id="split-doc"
                value={splitDocument}
                onChange={(e) => setSplitDocument(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="split-pct">Percentual (%) *</Label>
              <Input
                id="split-pct"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={splitPercentage}
                onChange={(e) => setSplitPercentage(e.target.value)}
                placeholder="Ex: 30"
              />
              {splits.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Disponível: {(100 - splits.reduce((acc, s) => acc + s.percentage, 0)).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSplitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSplit} disabled={isSavingSplit || !splitName.trim() || !splitPercentage}>
              {isSavingSplit ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar meta/entregável */}
      <Dialog open={isGoalDialogOpen} onOpenChange={(open) => { setIsGoalDialogOpen(open); if (!open) { setGoalName(""); setGoalDescription(""); setGoalTargetValue(""); setGoalDueDate(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contract?.compensation_type === "variable_deliverable" ? "Novo Entregável" : "Nova Meta"}
            </DialogTitle>
            <DialogDescription>
              {contract?.compensation_type === "variable_deliverable"
                ? "Cadastre um entregável. Ao aprovar a conclusão, o pagamento será liberado."
                : "Cadastre uma meta. Ao marcar como atingida, o pagamento correspondente será liberado."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Nome *</Label>
              <Input id="goal-name" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Ex: Entrega do módulo de relatórios" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-desc">Descrição / Critérios de Aceite</Label>
              <Textarea id="goal-desc" value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} placeholder="Descreva os critérios de aceite, prazos, métricas..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="goal-value">Valor (R$)</Label>
                <Input id="goal-value" type="number" min={0} step={0.01} value={goalTargetValue} onChange={(e) => setGoalTargetValue(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-date">Prazo</Label>
                <Input id="goal-date" type="date" value={goalDueDate} onChange={(e) => setGoalDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGoal} disabled={isSavingGoal || !goalName.trim()}>
              {isSavingGoal ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para revisar meta/entregável */}
      <Dialog open={!!reviewingGoal} onOpenChange={(open) => { if (!open) { setReviewingGoal(null); setReviewNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewingGoal?.status === "rejected" ? "Rejeitar" : "Aprovar"} {contract?.compensation_type === "variable_deliverable" ? "Entregável" : "Meta"}
            </DialogTitle>
            <DialogDescription>
              {reviewingGoal?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="review-notes">Observações (opcional)</Label>
              <Textarea id="review-notes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Descreva o resultado, ressalvas ou motivo da rejeição..." rows={3} />
            </div>
            {reviewingGoal?.target_value && (
              <p className="text-sm text-muted-foreground">
                Valor a liberar: <span className="font-semibold text-foreground">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(reviewingGoal.target_value)}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewingGoal(null); setReviewNotes(""); }}>Cancelar</Button>
            {reviewingGoal?.status !== "rejected" && (
              <Button variant="destructive" onClick={() => handleReviewGoal("rejected")}>Rejeitar</Button>
            )}
            <Button
              className={reviewingGoal?.status === "rejected" ? "" : "bg-green-600 hover:bg-green-700"}
              onClick={() => handleReviewGoal(reviewingGoal?.status === "rejected" ? "rejected" : "achieved")}
            >
              {reviewingGoal?.status === "rejected" ? "Confirmar Rejeição" : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holerite Digital */}
      {isHoleritoOpen && contract && profile && (
        <HoleritoDigital
          open={isHoleritoOpen}
          onClose={() => setIsHoleritoOpen(false)}
          referenceMonth={holeritoMonth}
          contract={{
            job_title: contract.job_title,
            salary: contract.salary,
            start_date: contract.start_date,
            clt_employee_id: contract.clt_employee_id,
            clt_work_regime: contract.clt_work_regime,
            pis_pasep: contract.pis_pasep,
            data_admissao: contract.data_admissao,
          }}
          profile={{
            full_name: profile.full_name,
            cpf: (authProfile?.cpf) ?? null,
          }}
          company={{
            name: companyInfo?.name ?? "",
            cnpj: companyInfo?.cnpj,
            address: companyInfo?.address,
          }}
        />
      )}
    </div>
  );
};

export default ContratoDetalhes;
