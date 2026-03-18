import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchContractsByCompany,
  fetchActiveContractsByCompany,
  fetchActiveTemplates,
  createContract,
  createDocument,
  createSignatures,
  createContractSplits,
  updateContractStatus,
  fetchDocumentHtml,
  searchContractsByCompany,
} from "@/services/contractService";
import {
  fetchProfilesByCompany,
  fetchProfilesByUserIds,
  fetchUserIdsByRole,
} from "@/services/profileService";
import { fetchCompanyFull } from "@/services/companyService";
import { fetchDelinquentContractIds, fetchPaymentsByCompany } from "@/services/paymentService";
import { sendEmail, gerarObrigacoesPJ } from "@/services/edgeFunctionService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  Calendar,
  Briefcase,
  Clock,
  AlertTriangle,
  XCircle,
  DollarSign,
  LayoutList,
  Columns3,
  ChevronRight,
  ChevronLeft,
  Check,
  Printer,
  RefreshCw,
  Trash2,
  UserPlus,
  Download,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { JobTitleCombobox } from "@/components/JobTitleCombobox";
import { ProfileCombobox } from "@/components/ProfileCombobox";
import { formatCurrency as formatCurrencyMask, parseCurrency } from "@/lib/masks";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/handleApiError";
import { logAuditAction } from "@/lib/auditLog";
import { sanitizeHtml } from "@/lib/sanitize";

interface Contract {
  id: string;
  user_id: string;
  company_id: string;
  contract_type: string;
  job_title: string;
  seniority: string | null;
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
  duration_type: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  deliverable_description: string | null;
  scope_description: string | null;
  payment_frequency: string | null;
  payment_day: number | null;
  monthly_value: number | null;
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
  profile?: {
    full_name: string;
    email: string;
  };
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  cpf?: string;
  pj_cnpj?: string;
  pj_razao_social?: string;
  pj_nome_fantasia?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_cep?: string;
}

interface AdminProfile {
  user_id: string;
  full_name: string;
  email: string;
  cpf?: string;
  nationality?: string;
  marital_status?: string;
  birth_date?: string;
  profession?: string;
  identity_number?: string;
  identity_issuer?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_cep?: string;
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  default_witness_count: number;
  is_system_default: boolean;
}

const Contratos = () => {
  useDocumentTitle("Contratos");
  const { profile, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [contratos, setContratos] = useState<Contract[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [fullTextMode, setFullTextMode] = useState(false);
  const [fullTextResults, setFullTextResults] = useState<Contract[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [contractToTerminate, setContractToTerminate] = useState<Contract | null>(null);
  const [renovandoContratoId, setRenovandoContratoId] = useState<string | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [contractType, setContractType] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [seniority, setSeniority] = useState("");
  
  const [salary, setSalary] = useState("");
  const [compensationType, setCompensationType] = useState("fixed");
  const [variableComponent, setVariableComponent] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  // PJ financial fields
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");
  const [paymentDay, setPaymentDay] = useState<string>("5");
  const [scopeDescription, setScopeDescription] = useState("");
  const [adjustmentIndex, setAdjustmentIndex] = useState("none");
  const [adjustmentDate, setAdjustmentDate] = useState("");
  // PJ split/beneficiaries
  const [splits, setSplits] = useState<{name: string; document: string; percentage: string}[]>([]);
  // PJ duration fields
  const [durationType, setDurationType] = useState("indefinite");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("months");
  const [deliverableDescription, setDeliverableDescription] = useState("");
  // CLT fields
  const [cltEmployeeId, setCltEmployeeId] = useState("");
  const [cltCtpsNumber, setCltCtpsNumber] = useState("");
  const [cltCtpsSeries, setCltCtpsSeries] = useState("");
  const [cltCboCode, setCltCboCode] = useState("");
  const [cltWorkRegime, setCltWorkRegime] = useState("presencial");
  // eSocial fields
  const [pisPasep, setPisPasep] = useState("");
  const [esocialCategoria, setEsocialCategoria] = useState("101");
  const [grauInstrucao, setGrauInstrucao] = useState("");
  const [racaCor, setRacaCor] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  // PJ document fields
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [witnessCount, setWitnessCount] = useState("0");
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("");
  // Contractor data type: "pj" = use company data only, "pf" = include personal data (name, CPF)
  const [contractorDataType, setContractorDataType] = useState<"pj" | "pf">("pj");
  // Stepper state
  const [step, setStep] = useState(1);
  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  // Overdue payments per contract
  const [overdueContracts, setOverdueContracts] = useState<Set<string>>(new Set());
  // Contracts that have no payments at all
  const [noPaymentContracts, setNoPaymentContracts] = useState<Set<string>>(new Set());

  // Full-text search effect — fires when fullTextMode is on and query >= 3 chars
  useEffect(() => {
    if (!fullTextMode || !profile?.company_id) {
      setFullTextResults([]);
      return;
    }
    if (debouncedSearchTerm.trim().length < 3) {
      setFullTextResults([]);
      return;
    }
    searchContractsByCompany(profile.company_id, debouncedSearchTerm.trim())
      .then(async (data) => {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const profilesData = userIds.length > 0
          ? await fetchProfilesByUserIds(userIds, "user_id, full_name, email")
          : [];
        const profileMap = new Map(profilesData.map((p: any) => [p.user_id, p]));
        setFullTextResults(data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) || undefined })));
      })
      .catch(() => setFullTextResults([]));
  }, [fullTextMode, debouncedSearchTerm, profile?.company_id]);

  useEffect(() => {
    fetchContratos();
    fetchProfiles();
    fetchAdminProfiles();
    fetchTemplates();
    fetchCompany();
    fetchOverduePayments();
    fetchNoPaymentContracts();
  }, [profile?.company_id]);

  const fetchContratos = async () => {
    if (!profile?.company_id) return;

    try {
      const data = await fetchContractsByCompany(profile.company_id);
      // Sort by created_at descending (service returns unordered)
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Batch-fetch profile info for all contracts
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const profilesData = userIds.length > 0
        ? await fetchProfilesByUserIds(userIds, "user_id, full_name, email")
        : [];
      const profileMap = new Map(profilesData.map((p) => [p.user_id, p]));

      const contratosWithProfiles = data.map((contract) => ({
        ...contract,
        profile: profileMap.get(contract.user_id) || undefined,
      }));

      setContratos(contratosWithProfiles);
    } catch (error) {
      logger.error("Error fetching contratos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    if (!profile?.company_id) return;

    try {
      const data = await fetchProfilesByCompany(profile.company_id, {
        isActive: true,
        select: "user_id, full_name, email, cpf, pj_cnpj, pj_razao_social, pj_nome_fantasia, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_cep",
      });
      setProfiles(data || []);
    } catch (error) {
      logger.error("Error fetching profiles:", error);
    }
  };

  const fetchAdminProfiles = async () => {
    if (!profile?.company_id) return;

    try {
      // First get admin user_ids from user_roles
      const adminUserIds = await fetchUserIdsByRole("admin");

      if (adminUserIds.length === 0) {
        setAdminProfiles([]);
        return;
      }

      // Fetch admin profiles from the company with additional fields
      const allCompanyProfiles = await fetchProfilesByCompany(profile.company_id, {
        isActive: true,
        select: "user_id, full_name, email, cpf, nationality, marital_status, birth_date, profession, identity_number, identity_issuer, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_cep",
      });
      const data = allCompanyProfiles.filter((p) => adminUserIds.includes(p.user_id));

      setAdminProfiles(data || []);

      // Auto-select current user if they are an admin
      if (data && data.length > 0 && !selectedRepresentativeId) {
        const currentUserAdmin = data.find(a => a.user_id === user?.id);
        if (currentUserAdmin) {
          setSelectedRepresentativeId(currentUserAdmin.user_id);
        }
      }
    } catch (error) {
      logger.error("Error fetching admin profiles:", error);
    }
  };

  const fetchCompany = async () => {
    if (!profile?.company_id) return;

    try {
      const data = await fetchCompanyFull(profile.company_id);
      setCompanyData(data);
    } catch (error) {
      logger.error("Error fetching company:", error);
    }
  };

  const fetchOverduePayments = async () => {
    if (!profile?.company_id) return;
    try {
      const data = await fetchDelinquentContractIds(profile.company_id);
      const ids = new Set(data.map((p) => p.contract_id));
      setOverdueContracts(ids);
    } catch (error) {
      logger.error("Error fetching overdue payments:", error);
    }
  };

  const fetchNoPaymentContracts = async () => {
    if (!profile?.company_id) return;
    try {
      // Get all active contract IDs
      const activeContracts = await fetchActiveContractsByCompany(profile.company_id);
      if (!activeContracts.length) return;

      // Get IDs of contracts that have at least one payment
      const paymentsData = await fetchPaymentsByCompany(profile.company_id);
      const contractsWithPayments = new Set(paymentsData.map((p) => p.contract_id));
      const noPayment = new Set(
        activeContracts.filter((c) => !contractsWithPayments.has(c.id)).map((c) => c.id)
      );
      setNoPaymentContracts(noPayment);
    } catch (error) {
      logger.error("Error fetching no-payment contracts:", error);
    }
  };

  const fetchTemplates = async () => {
    if (!profile?.company_id) return;

    try {
      const allActive = await fetchActiveTemplates(profile.company_id);
      // Filter to company templates + system defaults (matching original query behavior)
      const data = allActive.filter(
        (t) => t.is_system_default || t.company_id === profile!.company_id
      );
      setTemplates(data);

      // Auto-select default template
      const defaultTemplate = data.find((t) => t.is_system_default);
      if (defaultTemplate && !selectedTemplateId) {
        setSelectedTemplateId(defaultTemplate.id);
        setWitnessCount(String(defaultTemplate.default_witness_count || 0));
      }
    } catch (error) {
      logger.error("Error fetching templates:", error);
    }
  };

  const generateDocumentHtml = (template: ContractTemplate, contractData: { job_title: string; department?: string | null; salary?: number | null; start_date: string; end_date?: string | null }, collaboratorProfile: Profile, representativeProfile: AdminProfile | null, witnessCountNum: number = 0, usePersonalData: boolean = false) => {
    let html = template.content;

    // Build collaborator address
    const collaboratorAddress = [
      collaboratorProfile.address_street,
      collaboratorProfile.address_number,
      collaboratorProfile.address_complement,
      collaboratorProfile.address_neighborhood,
      collaboratorProfile.address_city,
      collaboratorProfile.address_state,
      collaboratorProfile.address_cep,
    ].filter(Boolean).join(", ") || "Endereço não informado";

    // Build representative address
    const representativeAddress = representativeProfile ? [
      representativeProfile.address_street,
      representativeProfile.address_number,
      representativeProfile.address_complement,
      representativeProfile.address_neighborhood,
      representativeProfile.address_city,
      representativeProfile.address_state,
      representativeProfile.address_cep,
    ].filter(Boolean).join(", ") || "Endereço não informado" : "";

    // Format representative birth date
    const representativeBirthDate = representativeProfile?.birth_date 
      ? format(new Date(representativeProfile.birth_date), "dd/MM/yyyy", { locale: ptBR })
      : "";

    // Determine contractor data based on selection
    // If includePersonalData = true, include personal data (Name + CPF) in ADDITION to PJ data
    const includePersonalData = usePersonalData;
    
    // Dados pessoais para incluir quando a opção está marcada
    const dadosPessoais = includePersonalData 
      ? `, neste ato representada por <strong>${collaboratorProfile.full_name}</strong>, inscrito(a) no CPF sob o nº <strong>${collaboratorProfile.cpf ? formatCPF(collaboratorProfile.cpf) : ""}</strong>`
      : "";

    // Replace template variables with actual data
    // Support both new Portuguese variable names and legacy English variable names
    const variables: Record<string, string> = {
      // Company/Contractor data (Portuguese)
      "{{contratante_razao_social}}": companyData?.name || "Empresa",
      "{{contratante_cnpj}}": companyData?.cnpj ? formatCNPJ(companyData.cnpj) : "",
      "{{contratante_endereco}}": companyData?.address || "Endereço não informado",
      
      // Company/Contractor data (Legacy English)
      "{{company_name}}": companyData?.name || "Empresa",
      "{{company_cnpj}}": companyData?.cnpj ? formatCNPJ(companyData.cnpj) : "",
      "{{company_address}}": companyData?.address || "Endereço não informado",
      "{{company_city}}": companyData?.address?.split(",").pop()?.trim() || "Cidade",
      
      // Company representative data (Portuguese)
      "{{representante_nome}}": representativeProfile?.full_name || "",
      "{{representante_cpf}}": representativeProfile?.cpf ? formatCPF(representativeProfile.cpf) : "",
      "{{representante_nacionalidade}}": representativeProfile?.nationality || "",
      "{{representante_estado_civil}}": representativeProfile?.marital_status || "",
      "{{representante_data_nascimento}}": representativeBirthDate,
      "{{representante_profissao}}": representativeProfile?.profession || "",
      "{{representante_rg}}": representativeProfile?.identity_number || "",
      "{{representante_orgao_expedidor}}": representativeProfile?.identity_issuer || "",
      "{{representante_endereco}}": representativeAddress,
      
      // Company representative data (Legacy English)
      "{{company_representative_name}}": representativeProfile?.full_name || "",
      
      // Contracted party data (Portuguese) - always uses PJ data, with optional personal data
      "{{contratado_nome}}": collaboratorProfile.pj_razao_social || collaboratorProfile.full_name,
      "{{contratado_nome_fantasia}}": collaboratorProfile.pj_nome_fantasia || collaboratorProfile.pj_razao_social || collaboratorProfile.full_name,
      "{{contratado_cpf_cnpj}}": collaboratorProfile.pj_cnpj ? formatCNPJ(collaboratorProfile.pj_cnpj) : "",
      "{{contratado_endereco}}": collaboratorAddress,
      // Dados pessoais (incluídos apenas quando a opção está marcada)
      "{{contratado_dados_pessoais}}": dadosPessoais,
      // Personal data (always available for reference in custom templates)
      "{{contratado_nome_pessoal}}": collaboratorProfile.full_name,
      "{{contratado_cpf}}": collaboratorProfile.cpf ? formatCPF(collaboratorProfile.cpf) : "",
      // PJ data (always available for reference)
      "{{contratado_razao_social}}": collaboratorProfile.pj_razao_social || "",
      "{{contratado_cnpj}}": collaboratorProfile.pj_cnpj ? formatCNPJ(collaboratorProfile.pj_cnpj) : "",
      
      // Contracted PJ data (Legacy English)
      "{{contractor_name}}": collaboratorProfile.full_name,
      "{{contractor_cpf}}": collaboratorProfile.cpf ? formatCPF(collaboratorProfile.cpf) : "",
      "{{contractor_company_name}}": collaboratorProfile.pj_razao_social || collaboratorProfile.full_name,
      "{{contractor_cnpj}}": collaboratorProfile.pj_cnpj ? formatCNPJ(collaboratorProfile.pj_cnpj) : "",
      "{{contractor_address}}": collaboratorAddress,
      
      // Contract data (Portuguese)
      "{{cargo}}": contractData.job_title,
      "{{departamento}}": contractData.department || "Não especificado",
      "{{valor}}": contractData.salary ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(contractData.salary) : "A definir",
      "{{data_inicio}}": format(new Date(contractData.start_date), "dd/MM/yyyy", { locale: ptBR }),
      "{{data_fim}}": contractData.end_date ? format(new Date(contractData.end_date), "dd/MM/yyyy", { locale: ptBR }) : "Indeterminado",
      "{{data_atual}}": format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      "{{cidade}}": companyData?.address?.split(",").pop()?.trim() || "Cidade",
      
      // Contract data (Legacy English)
      "{{job_title}}": contractData.job_title,
      "{{salary}}": contractData.salary ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(contractData.salary) : "A definir",
      "{{start_date}}": format(new Date(contractData.start_date), "dd/MM/yyyy", { locale: ptBR }),
      "{{end_date}}": contractData.end_date ? format(new Date(contractData.end_date), "dd/MM/yyyy", { locale: ptBR }) : "Indeterminado",
      "{{current_date}}": format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      "{{city}}": companyData?.address?.split(",").pop()?.trim() || "Cidade",
    };

    Object.entries(variables).forEach(([key, value]) => {
      html = html.replace(new RegExp(key, "g"), value);
    });

    // Process Handlebars-style {{#if variable}}...{{else}}...{{/if}} conditionals
    html = html.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/gi,
      (_match, varName: string, ifBlock: string, elseBlock: string = "") => {
        // Look up the variable value — check if it was already replaced (truthy and not a placeholder)
        const key = `{{${varName}}}`;
        const val = variables[key];
        // Variable is "truthy" if it exists, is non-empty, and isn't a placeholder like "Indeterminado"
        const isTruthy = val !== undefined && val !== "" && val !== "Indeterminado";
        return isTruthy ? ifBlock : elseBlock;
      }
    );

    // Remove Handlebars-style witness sections if no witnesses
    if (witnessCountNum === 0) {
      // Remove {{#each witnesses}}...{{/each}} blocks
      html = html.replace(/\{\{#each\s+witnesses\}\}[\s\S]*?\{\{\/each\}\}/gi, "");
      // Remove sections containing "TESTEMUNHAS:" or "Testemunhas:" with their content
      html = html.replace(/<p[^>]*>[\s]*TESTEMUNHAS:[\s\S]*?(?=<\/div>|<h|<p[^>]*>[^T])/gi, "");
      html = html.replace(/<h[1-6][^>]*>[\s]*TESTEMUNHAS[\s]*<\/h[1-6]>[\s\S]*?(?=<\/div>|<h[1-6]|$)/gi, "");
      // Remove standalone witness template variables
      html = html.replace(/\{\{this\.name\}\}/g, "");
      html = html.replace(/\{\{this\.cpf\}\}/g, "");
    }

    return html;
  };

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, "");
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const handleCreateContract = async () => {
    // Prevent double-submission
    if (isSubmitting) return;

    // Validate required fields
    const errors: Record<string, boolean> = {};
    if (!selectedUserId) errors.colaborador = true;
    if (!contractType) errors.tipoContrato = true;
    if (!jobTitle) errors.cargo = true;
    if (!startDate) errors.dataInicio = true;
    if (contractType === "PJ" && !selectedTemplateId) errors.template = true;
    if (contractType === "PJ" && !selectedRepresentativeId) errors.representante = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Preencha todos os campos obrigatórios destacados em vermelho");
      // Se campos do step 1 estiverem inválidos, volta para step 1
      if (errors.colaborador || errors.tipoContrato || errors.dataInicio) {
        setStep(1);
      }
      return;
    }

    // Guarda defensiva: contractType deve ser um valor válido do enum
    const validContractTypes = ["CLT", "PJ", "estagio", "temporario"] as const;
    type ValidContractType = typeof validContractTypes[number];
    if (!validContractTypes.includes(contractType as ValidContractType)) {
      toast.error("Tipo de contrato inválido. Selecione novamente.");
      setStep(1);
      setContractType("");
      return;
    }

    setValidationErrors({});

    if (!profile?.company_id) {
      toast.error("Erro: empresa não identificada");
      return;
    }

    // PJ contracts require employee to have company data (CNPJ and Razão Social)
    if (contractType === "PJ") {
      const selectedProfile = profiles.find(p => p.user_id === selectedUserId);
      if (!selectedProfile?.pj_cnpj || !selectedProfile?.pj_razao_social) {
        toast.error("O colaborador selecionado não possui dados de empresa PJ cadastrados (CNPJ e Razão Social). Atualize o cadastro do colaborador antes de criar um contrato PJ.");
        return;
      }
    }

    // PJ contracts require representative to have complete data
    if (contractType === "PJ") {
      const selectedAdmin = adminProfiles.find(a => a.user_id === selectedRepresentativeId);
      const missingFields = [];
      if (!selectedAdmin?.cpf) missingFields.push("CPF");
      if (!selectedAdmin?.identity_number) missingFields.push("RG");
      if (!selectedAdmin?.nationality) missingFields.push("Nacionalidade");
      
      if (missingFields.length > 0) {
        toast.error(`O representante selecionado não possui dados obrigatórios: ${missingFields.join(", ")}. Atualize o perfil do administrador antes de criar o contrato.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Calculate end_date for time-based contracts
      let endDate = null;
      if (contractType === "PJ" && durationType === "time_based" && durationValue) {
        const [y, m, d] = startDate.split('-').map(Number);
        const start = new Date(y, m - 1, d);
        const value = parseInt(durationValue);
        if (durationUnit === "days") {
          start.setDate(start.getDate() + value);
        } else if (durationUnit === "weeks") {
          start.setDate(start.getDate() + (value * 7));
        } else if (durationUnit === "months") {
          start.setMonth(start.getMonth() + value);
        } else if (durationUnit === "years") {
          start.setFullYear(start.getFullYear() + value);
        }
        endDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      }

      const insertData = {
        company_id: profile.company_id,
        user_id: selectedUserId,
        contract_type: contractType as "CLT" | "PJ" | "estagio" | "temporario",
        job_title: jobTitle,
        seniority: seniority || null,
        department: null,
        salary: salary ? parseCurrency(salary) : null,
        start_date: startDate,
        end_date: endDate,
        status: "active" as const,
        created_by: profile.user_id,
        duration_type: contractType === "PJ" ? durationType : null,
        duration_value: contractType === "PJ" && durationType === "time_based" && durationValue ? parseInt(durationValue) : null,
        duration_unit: contractType === "PJ" && durationType === "time_based" ? durationUnit : null,
        deliverable_description: contractType === "PJ" && durationType === "delivery_based" ? deliverableDescription : null,
        payment_frequency: contractType === "PJ" ? paymentFrequency : null,
        payment_day: contractType === "PJ" && paymentDay ? parseInt(paymentDay) : null,
        monthly_value: contractType === "PJ" && salary ? parseCurrency(salary) : null,
        scope_description: contractType === "PJ" && scopeDescription ? scopeDescription : null,
        adjustment_index: contractType === "PJ" && adjustmentIndex && adjustmentIndex !== "none" ? adjustmentIndex : null,
        adjustment_date: contractType === "PJ" && adjustmentDate ? adjustmentDate : null,
        compensation_type: contractType === "PJ" ? compensationType : "fixed",
        clt_employee_id: contractType !== "PJ" && cltEmployeeId ? cltEmployeeId : null,
        clt_ctps_number: contractType !== "PJ" && cltCtpsNumber ? cltCtpsNumber : null,
        clt_ctps_series: contractType !== "PJ" && cltCtpsSeries ? cltCtpsSeries : null,
        clt_cbo_code: contractType !== "PJ" && cltCboCode ? cltCboCode : null,
        clt_work_regime: contractType !== "PJ" ? cltWorkRegime : null,
        pis_pasep: contractType !== "PJ" && pisPasep ? pisPasep : null,
        esocial_categoria: contractType !== "PJ" && esocialCategoria ? esocialCategoria : null,
        grau_instrucao: contractType !== "PJ" && grauInstrucao ? grauInstrucao : null,
        raca_cor: contractType !== "PJ" && racaCor ? racaCor : null,
        estado_civil: contractType !== "PJ" && estadoCivil ? estadoCivil : null,
        data_admissao: contractType !== "PJ" && dataAdmissao ? dataAdmissao : null,
        hourly_rate: contractType === "PJ" && compensationType === "hourly" && salary ? parseCurrency(salary) : null,
        variable_component: contractType === "PJ" && compensationType === "mixed" && variableComponent ? parseCurrency(variableComponent) : null,
        goal_description: contractType === "PJ" && (compensationType === "variable_goal" || compensationType === "variable_deliverable") && goalDescription ? goalDescription : null,
      };

      const contractData = await createContract(insertData);

      // For PJ contracts, generate the document and create signatures
      if (contractType === "PJ" && selectedTemplateId && contractData) {
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        const collaboratorProfile = profiles.find(p => p.user_id === selectedUserId);
        const representativeProfile = adminProfiles.find(a => a.user_id === selectedRepresentativeId) || null;
        
        if (selectedTemplate && collaboratorProfile) {
          const usePersonalData = contractorDataType === "pf";
          const documentHtml = generateDocumentHtml(selectedTemplate, { ...insertData, end_date: endDate }, collaboratorProfile, representativeProfile, parseInt(witnessCount), usePersonalData);
          
          let docData;
          try {
            docData = await createDocument({
              contract_id: contractData.id,
              template_id: selectedTemplateId,
              document_html: documentHtml,
              witness_count: parseInt(witnessCount),
              signature_status: "pending",
              company_representative_id: selectedRepresentativeId || null,
            });
          } catch (docError) {
            logger.error("Error creating document:", docError);
            toast.error("Contrato criado, mas houve erro ao gerar o documento");
          }

          if (docData) {
            // Create signature entries
            const signatureEntries = [];

            // 1. Contractor signature (the PJ employee)
            signatureEntries.push({
              document_id: docData.id,
              signer_type: "contractor" as const,
              signer_order: 1,
              signer_user_id: selectedUserId,
              signer_name: collaboratorProfile.pj_razao_social || collaboratorProfile.full_name,
              signer_email: collaboratorProfile.email,
              signer_document: collaboratorProfile.pj_cnpj || collaboratorProfile.cpf || null,
            });

            // 2. Company representative signature (selected admin)
            signatureEntries.push({
              document_id: docData.id,
              signer_type: "company_representative" as const,
              signer_order: 2,
              signer_user_id: selectedRepresentativeId || null,
              signer_name: representativeProfile?.full_name || profile.full_name,
              signer_email: representativeProfile?.email || profile.email,
              signer_document: representativeProfile?.cpf || profile.cpf || null,
            });

            // 3. Witness signatures (if any)
            const witnessCountNum = parseInt(witnessCount);
            for (let i = 0; i < witnessCountNum; i++) {
              signatureEntries.push({
                document_id: docData.id,
                signer_type: "witness" as const,
                signer_order: 3 + i,
                signer_user_id: null,
                signer_name: `Testemunha ${i + 1}`,
                signer_email: "",
                signer_document: null,
              });
            }

            try {
              await createSignatures(signatureEntries);
            } catch (sigError) {
              logger.error("Error creating signatures:", sigError);
              toast.error("Documento criado, mas houve erro ao configurar assinaturas");
            }
          }
        }
      }

      // Save splits if any
      if (splits.length > 0 && contractData) {
        const splitsToInsert = splits
          .filter(s => s.name && s.percentage)
          .map(s => ({
            contract_id: contractData.id,
            beneficiary_name: s.name,
            beneficiary_document: s.document || null,
            percentage: parseFloat(s.percentage),
          }));
        if (splitsToInsert.length > 0) {
          try {
            await createContractSplits(splitsToInsert);
          } catch (splitError) {
            logger.error("Error saving splits:", splitError);
            toast.error("Contrato criado, mas houve erro ao salvar splits");
          }
        }
      }

      // Log audit: contract created
      if (contractData) {
        logAuditAction({
          contractId: contractData.id,
          action: "contract_created",
          actorName: profile?.full_name || "",
          actorEmail: profile?.email || "",
          details: {
            contractType,
            jobTitle,
            startDate,
            collaborator: selectedUserId,
          },
        });
      }

      // For PJ contracts, generate financial obligations for the current month
      if (contractType === "PJ" && contractData) {
        const now = new Date();
        gerarObrigacoesPJ(now.getFullYear(), now.getMonth() + 1).catch((err) => {
          logger.error("Erro ao gerar obrigações financeiras:", err);
        });
      }

      toast.success("Contrato criado com sucesso!");

      // Mark old contract as renewed if this was a renewal
      if (renovandoContratoId) {
        try {
          await updateContractStatus(renovandoContratoId, "renovado");
          toast.info("Contrato anterior marcado como Renovado.");
        } catch (e) {
          console.error("Erro ao marcar contrato como renovado", e);
        }
        setRenovandoContratoId(null);
      }

      // Send email notification to PJ for signature (async, non-blocking)
      if (contractType === "PJ" && contractData) {
        const collab = profiles.find(p => p.user_id === selectedUserId);
        if (collab?.email) {
          try {
            const signLink = `${window.location.origin}/assinar-contrato/${contractData.id}`;
            const salaryFormatted = salary ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseCurrency(salary)) : null;
            const startFormatted = format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR });
            const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px}.button{display:inline-block;background:#667eea;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0}.footer{text-align:center;margin-top:20px;color:#666;font-size:12px}.info-box{background:white;padding:20px;border-radius:8px;margin:20px 0;box-shadow:0 2px 4px rgba(0,0,0,0.1)}</style>
</head><body><div class="container">
<div class="header"><h1>✏️ Novo Contrato para Assinatura</h1></div>
<div class="content">
<p>Olá <strong>${collab.full_name}</strong>,</p>
<p>Um novo contrato foi criado para você no sistema Aure:</p>
<div class="info-box">
<p><strong>Cargo:</strong> ${jobTitle}</p>
<p><strong>Tipo:</strong> ${contractType}</p>
<p><strong>Início:</strong> ${startFormatted}</p>
${salaryFormatted ? `<p><strong>Valor:</strong> ${salaryFormatted}</p>` : ""}
</div>
<p>Acesse o sistema para revisar e assinar o contrato:</p>
<p style="text-align:center"><a href="${signLink}" class="button">Visualizar Contrato</a></p>
<div class="footer"><p>Aure System - Gestão de Colaboradores</p></div>
</div></div></body></html>`;

            await sendEmail({
              to: collab.email,
              subject: `✏️ Novo Contrato para Assinatura - ${jobTitle}`,
              html: emailHtml,
              from_name: "Aure System",
            });
          } catch (emailError) {
            logger.error("Error sending contract email:", emailError);
          }
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContratos();
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao criar contrato"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = useCallback(() => {
    setRenovandoContratoId(null);
    setSelectedUserId("");
    setContractType("");
    setJobTitle("");
    setSeniority("");
    
    setSalary("");
    setCompensationType("fixed");
    setVariableComponent("");
    setGoalDescription("");
    setStartDate("");
    setPaymentFrequency("monthly");
    setPaymentDay("5");
    setScopeDescription("");
    setAdjustmentIndex("none");
    setAdjustmentDate("");
    setSplits([]);
    setDurationType("indefinite");
    setDurationValue("");
    setDurationUnit("months");
    setDeliverableDescription("");
    setCltEmployeeId("");
    setCltCtpsNumber("");
    setCltCtpsSeries("");
    setCltCboCode("");
    setCltWorkRegime("presencial");
    setPisPasep("");
    setEsocialCategoria("101");
    setGrauInstrucao("");
    setRacaCor("");
    setEstadoCivil("");
    setDataAdmissao("");
    setSelectedTemplateId("");
    setWitnessCount("0");
    setSelectedRepresentativeId("");
    setContractorDataType("pj");
    setValidationErrors({});
    setStep(1);
  }, []);

  const totalSteps = contractType === "PJ" ? 5 : 2;

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, boolean> = {};
    if (currentStep === 1) {
      if (!selectedUserId) errors.colaborador = true;
      if (!contractType) errors.tipoContrato = true;
      if (!startDate) errors.dataInicio = true;
    } else if (currentStep === 2) {
      if (!jobTitle) errors.cargo = true;
    } else if (currentStep === 3 && contractType === "PJ") {
      // Step 3 (Financeiro) — no required fields
    } else if (currentStep === 4 && contractType === "PJ") {
      if (!selectedTemplateId) errors.template = true;
      if (!selectedRepresentativeId) errors.representante = true;
    }
    // Step 5 (preview) has no validation — it's read-only
    if (Object.keys(errors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...errors }));
      return false;
    }
    // Clear errors for current step fields on success
    if (currentStep === 1) {
      setValidationErrors(prev => { const { colaborador, tipoContrato, dataInicio, ...rest } = prev; return rest; });
    } else if (currentStep === 2) {
      setValidationErrors(prev => { const { cargo, ...rest } = prev; return rest; });
    } else if (currentStep === 4) {
      setValidationErrors(prev => { const { template, representante, ...rest } = prev; return rest; });
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleTerminateContract = async () => {
    if (!contractToTerminate) return;

    setIsSubmitting(true);
    try {
      await updateContractStatus(contractToTerminate.id, "terminated");

      // Log audit: contract terminated
      logAuditAction({
        contractId: contractToTerminate.id,
        action: "contract_status_changed",
        actorName: profile?.full_name || "",
        actorEmail: profile?.email || "",
        details: {
          previousStatus: contractToTerminate.status,
          newStatus: "terminated",
        },
      });

      toast.success("Contrato encerrado com sucesso!");
      setIsTerminateDialogOpen(false);
      setContractToTerminate(null);
      fetchContratos();
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao encerrar contrato"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePDF = async (contrato: Contract) => {
    try {
      const docHtml = await fetchDocumentHtml(contrato.id);

      if (!docHtml) {
        toast.error("Nenhum documento encontrado para este contrato");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Permita pop-ups para gerar o PDF");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Contrato - ${contrato.profile?.full_name || "Colaborador"}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20mm; }
            }
            body {
              font-family: 'Times New Roman', serif;
              line-height: 1.6;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
              color: #000;
            }
            h1, h2, h3 { font-weight: bold; }
            h1 { font-size: 18pt; text-align: center; }
            h2 { font-size: 14pt; }
            h3 { font-size: 12pt; }
            p { margin-bottom: 8pt; text-align: justify; }
          </style>
        </head>
        <body>
          ${docHtml}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
      toast.success("Documento aberto para impressão/PDF");
    } catch (error) {
      logger.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF do contrato");
    }
  };

  const handleRenewContract = (contrato: Contract) => {
    // Reset all form state before pre-filling
    resetForm();
    // Pre-fill the contract creation form with data from existing contract
    setSelectedUserId(contrato.user_id);
    setContractType(contrato.contract_type);
    setJobTitle(contrato.job_title);
    setSeniority(contrato.seniority || "");
    setSalary(contrato.salary ? formatCurrencyMask(String(contrato.salary)) : "");
    setCompensationType(contrato.compensation_type || "fixed");
    if (contrato.variable_component) setVariableComponent(formatCurrencyMask(String(contrato.variable_component)));
    if (contrato.goal_description) setGoalDescription(contrato.goal_description);
    setDeliverableDescription(contrato.deliverable_description || "");

    // Set start date to the day after the existing contract ends, or today
    const newStartDate = contrato.end_date
      ? format(new Date(new Date(contrato.end_date).getTime() + 86400000), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
    setStartDate(newStartDate);

    // Copy duration settings
    if (contrato.duration_type) setDurationType(contrato.duration_type);
    if (contrato.duration_value) setDurationValue(contrato.duration_value.toString());
    if (contrato.duration_unit) setDurationUnit(contrato.duration_unit);

    setRenovandoContratoId(contrato.id);
    setIsDialogOpen(true);
    toast.info("Formulário pré-preenchido com dados do contrato anterior.");
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

  const getStatusClassName = (status: string) => {
    const classNames: Record<string, string> = {
      active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      suspended: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
      em_revisao: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
      renovado: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
      terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      expired: "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-500 border-gray-200",
      draft: "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200",
      sent: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      signed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      pending_signature: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    };
    return classNames[status] || "";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Vigente",
      draft: "Rascunho",
      sent: "Enviado",
      signed: "Assinado",
      suspended: "Suspenso",
      em_revisao: "Em Revisão",
      renovado: "Renovado",
      terminated: "Encerrado",
      expired: "Expirado",
      inactive: "Inativo",
      pending_signature: "Aguardando Assinatura",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getDurationDisplay = (contract: Contract) => {
    if (contract.contract_type !== "PJ") return null;
    
    if (!contract.duration_type || contract.duration_type === "indefinite") {
      return { label: "Indeterminado", detail: null };
    }
    
    if (contract.duration_type === "time_based") {
      const unitLabels: Record<string, string> = {
        days: "dias",
        weeks: "sem.",
        months: "meses",
        years: "anos",
      };
      return {
        label: "Por Tempo",
        detail: contract.duration_value 
          ? `${contract.duration_value} ${unitLabels[contract.duration_unit || "months"]}` 
          : null,
      };
    }
    
    if (contract.duration_type === "delivery_based") {
      return {
        label: "Por Entrega",
        detail: contract.deliverable_description 
          ? contract.deliverable_description.substring(0, 30) + (contract.deliverable_description.length > 30 ? "..." : "")
          : null,
      };
    }
    
    return null;
  };

  const getExpirationAlert = (contract: Contract) => {
    if (!contract.end_date || contract.status !== "active") return null;
    
    const today = new Date();
    const endDate = new Date(contract.end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { level: "expired", days: Math.abs(daysUntilExpiry), label: "Expirado", color: "bg-destructive text-destructive-foreground" };
    } else if (daysUntilExpiry <= 7) {
      return { level: "critical", days: daysUntilExpiry, label: "Crítico", color: "bg-destructive text-destructive-foreground" };
    } else if (daysUntilExpiry <= 14) {
      return { level: "warning", days: daysUntilExpiry, label: "Atenção", color: "bg-orange-500 text-white" };
    } else if (daysUntilExpiry <= 30) {
      return { level: "notice", days: daysUntilExpiry, label: "Aviso", color: "bg-amber-500 text-white" };
    }
    return null;
  };

  // Count expiring contracts
  const expiringContractsCount = contratos.filter(c => {
    const alert = getExpirationAlert(c);
    return alert && alert.level !== "expired";
  }).length;

  const [quickFilter, setQuickFilter] = useState<"" | "expiring30" | "noPayment">("")

  const filteredContratos = useMemo(() => {
    const source = fullTextMode && debouncedSearchTerm.trim().length >= 3 ? fullTextResults : contratos;
    return source.filter((c) => {
    const matchesSearch = fullTextMode
      ? true // already filtered by DB
      : c.profile?.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        c.job_title.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = typeFilter === "all" || c.contract_type === typeFilter;
    const matchesQuick = !quickFilter || 
      (quickFilter === "expiring30" && (() => {
        const alert = getExpirationAlert(c);
        return alert && alert.level !== "expired";
      })()) ||
      (quickFilter === "noPayment" && noPaymentContracts.has(c.id));
    return matchesSearch && matchesStatus && matchesType && matchesQuick;
  });
  }, [contratos, fullTextResults, fullTextMode, debouncedSearchTerm, statusFilter, typeFilter, quickFilter, noPaymentContracts]);

  const CONTRATOS_PER_PAGE = 25;
  const totalContratosPages = Math.max(1, Math.ceil(filteredContratos.length / CONTRATOS_PER_PAGE));
  const paginatedContratos = filteredContratos.slice(
    (currentPage - 1) * CONTRATOS_PER_PAGE,
    currentPage * CONTRATOS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, debouncedSearchTerm, fullTextMode, quickFilter]);

  // Total comprometido mensal (contratos ativos)
  const totalComprometido = contratos
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + (c.salary || 0), 0);

  const exportToCSV = () => {
    const statusLabel: Record<string, string> = {
      active: "Ativo", inactive: "Inativo", terminated: "Encerrado",
      assinado: "Assinado", enviado: "Aguardando assinaturas", cancelado: "Cancelado",
    };
    const typeLabel: Record<string, string> = {
      CLT: "CLT", PJ: "PJ", freelancer: "Freelancer", estagio: "Estágio", temporario: "Temporário",
    };
    const headers = ["Nome", "E-mail", "Cargo", "Tipo", "Departamento", "Início", "Fim", "Salário/Valor", "Status"];
    const rows = filteredContratos.map((c) => [
      c.profile?.full_name ?? "",
      c.profile?.email ?? "",
      c.job_title,
      typeLabel[c.contract_type] ?? c.contract_type,
      c.department ?? "",
      c.start_date ? format(new Date(c.start_date), "dd/MM/yyyy", { locale: ptBR }) : "",
      c.end_date ? format(new Date(c.end_date), "dd/MM/yyyy", { locale: ptBR }) : "",
      c.salary != null ? c.salary.toFixed(2).replace(".", ",")
        : c.hourly_rate != null ? c.hourly_rate.toFixed(2).replace(".", ",")
        : "",
      statusLabel[c.status] ?? c.status,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contratos_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Contratos exportados com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {expiringContractsCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">
              {expiringContractsCount} contrato(s) próximo(s) do vencimento
            </p>
            <p className="text-sm text-muted-foreground">
              Revise os contratos marcados com alertas e tome as medidas necessárias.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os contratos dos colaboradores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} title="Exportar lista filtrada como CSV">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        {isAdmin() && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Criar Novo Contrato</DialogTitle>
                <DialogDescription>
                  Etapa {step} de {totalSteps} — {step === 1 ? "Partes e Datas" : step === 2 ? "Cargo e Remuneração" : step === 3 ? "Financeiro" : step === 4 ? "Documento PJ" : "Preview"}
                </DialogDescription>
                {/* Stepper progress bar */}
                <div className="flex items-center gap-2 pt-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 flex-1">
                      <div
                        className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold border-2 transition-colors ${
                          i + 1 < step
                            ? "bg-primary border-primary text-primary-foreground"
                            : i + 1 === step
                            ? "border-primary text-primary bg-primary/10"
                            : "border-muted-foreground/30 text-muted-foreground"
                        }`}
                      >
                        {i + 1 < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div className={`flex-1 h-0.5 rounded ${i + 1 < step ? "bg-primary" : "bg-muted-foreground/20"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
                {/* Step 1: Partes e Datas */}
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label className={validationErrors.colaborador ? "text-destructive" : ""}>
                        Colaborador <span className="text-destructive">*</span>
                      </Label>
                      <div className={validationErrors.colaborador ? "ring-2 ring-destructive rounded-md" : ""}>
                        <ProfileCombobox
                          profiles={profiles}
                          value={selectedUserId}
                          onChange={(value) => {
                            setSelectedUserId(value);
                            if (value) setValidationErrors(prev => ({ ...prev, colaborador: false }));
                          }}
                          placeholder="Selecione um colaborador"
                        />
                      </div>
                      {validationErrors.colaborador && (
                        <p className="text-xs text-destructive">Selecione um colaborador</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className={validationErrors.tipoContrato ? "text-destructive" : ""}>
                          Tipo de Contrato <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={contractType} 
                          onValueChange={(value) => {
                            setContractType(value);
                            if (value) setValidationErrors(prev => ({ ...prev, tipoContrato: false }));
                          }}
                        >
                          <SelectTrigger className={validationErrors.tipoContrato ? "ring-2 ring-destructive" : ""}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLT">CLT</SelectItem>
                            <SelectItem value="PJ">PJ</SelectItem>
                            <SelectItem value="estagio">Estágio</SelectItem>
                            <SelectItem value="temporario">Temporário</SelectItem>
                          </SelectContent>
                        </Select>
                        {contractType && (
                          <p className="text-xs text-muted-foreground">
                            {contractType === "PJ" && "Prestação de serviço por pessoa jurídica. Sem vínculo empregatício, paga NF."}
                            {contractType === "CLT" && "Vínculo empregatício com carteira assinada, benefícios e encargos trabalhistas."}
                            {contractType === "estagio" && "Contrato educacional conforme Lei do Estágio (11.788/08)."}
                            {contractType === "temporario" && "Vínculo temporário conforme Lei 6.019/74, prazo determinado."}
                          </p>
                        )}
                        {validationErrors.tipoContrato && (
                          <p className="text-xs text-destructive">Selecione o tipo</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className={validationErrors.dataInicio ? "text-destructive" : ""}>
                          Data de Início <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            if (e.target.value) setValidationErrors(prev => ({ ...prev, dataInicio: false }));
                          }}
                          className={validationErrors.dataInicio ? "ring-2 ring-destructive" : ""}
                        />
                        {validationErrors.dataInicio && (
                          <p className="text-xs text-destructive">Informe a data</p>
                        )}
                      </div>
                    </div>
                    {/* Contract Type Info */}
                    {contractType && (
                      <div className={`p-3 rounded-lg text-sm ${
                        contractType === "PJ" 
                          ? "bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300" 
                          : "bg-muted border border-border text-muted-foreground"
                      }`}>
                        {contractType === "PJ" ? (
                          <>
                            <p className="font-medium">Contrato PJ (Faturável)</p>
                            <p className="text-xs mt-1">
                              Contratos PJ incluem gestão completa com assinaturas digitais, alertas e conformidade legal. 
                              Este tipo de contrato é cobrado mensalmente.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Contrato para Gestão Interna</p>
                            <p className="text-xs mt-1">
                              Contratos {contractType === "CLT" ? "CLT" : contractType === "estagio" ? "de Estágio" : "Temporários"} são 
                              para organização interna da empresa e não geram cobrança adicional.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Step 2: Cargo e Remuneração */}
                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label className={validationErrors.cargo ? "text-destructive" : ""}>
                        Cargo <span className="text-destructive">*</span>
                      </Label>
                      <div className={validationErrors.cargo ? "ring-2 ring-destructive rounded-md" : ""}>
                        <JobTitleCombobox
                          value={jobTitle}
                          onChange={(value) => {
                            setJobTitle(value);
                            if (value) setValidationErrors(prev => ({ ...prev, cargo: false }));
                          }}
                          placeholder="Selecione ou digite um cargo"
                        />
                      </div>
                      {validationErrors.cargo && (
                        <p className="text-xs text-destructive">Informe o cargo</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Nível / Senioridade</Label>
                      <Select value={seniority} onValueChange={setSeniority}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estagio">Estágio</SelectItem>
                          <SelectItem value="junior">Júnior</SelectItem>
                          <SelectItem value="pleno">Pleno</SelectItem>
                          <SelectItem value="senior">Sênior</SelectItem>
                          <SelectItem value="especialista">Especialista</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="diretor">Diretor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* CLT-specific fields */}
                    {contractType !== "PJ" && contractType !== "" && (
                      <div className="space-y-3 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados Trabalhistas</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Matrícula</Label>
                            <Input
                              placeholder="Ex: 000123"
                              value={cltEmployeeId}
                              onChange={(e) => setCltEmployeeId(e.target.value)}
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Código CBO</Label>
                            <Input
                              placeholder="Ex: 2124-05"
                              value={cltCboCode}
                              onChange={(e) => setCltCboCode(e.target.value)}
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">Classificação Brasileira de Ocupações</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Nº CTPS</Label>
                            <Input
                              placeholder="Ex: 0001234"
                              value={cltCtpsNumber}
                              onChange={(e) => setCltCtpsNumber(e.target.value)}
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Série CTPS</Label>
                            <Input
                              placeholder="Ex: 0001"
                              value={cltCtpsSeries}
                              onChange={(e) => setCltCtpsSeries(e.target.value)}
                              className="h-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Regime de Trabalho</Label>
                          <Select value={cltWorkRegime} onValueChange={setCltWorkRegime}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="presencial">Presencial</SelectItem>
                              <SelectItem value="teletrabalho">Teletrabalho (Home Office)</SelectItem>
                              <SelectItem value="hibrido">Híbrido</SelectItem>
                              <SelectItem value="parcial">Jornada Parcial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* eSocial fields */}
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados eSocial (opcional)</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">PIS/PASEP</Label>
                              <Input
                                placeholder="000.00000.00-0"
                                value={pisPasep}
                                onChange={(e) => setPisPasep(e.target.value)}
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Data de Admissão</Label>
                              <Input
                                type="date"
                                value={dataAdmissao}
                                onChange={(e) => setDataAdmissao(e.target.value)}
                                className="h-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Categoria eSocial</Label>
                            <Select value={esocialCategoria} onValueChange={setEsocialCategoria}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="101">101 — Empregado geral</SelectItem>
                                <SelectItem value="103">103 — Trabalhador aprendiz</SelectItem>
                                <SelectItem value="104">104 — Empregado doméstico</SelectItem>
                                <SelectItem value="105">105 — Trabalhador intermitente</SelectItem>
                                <SelectItem value="106">106 — Empregado rural</SelectItem>
                                <SelectItem value="111">111 — Dirigente sindical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Grau de Instrução</Label>
                              <Select value={grauInstrucao} onValueChange={setGrauInstrucao}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
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
                            <div className="space-y-2">
                              <Label className="text-sm">Raça/Cor</Label>
                              <Select value={racaCor} onValueChange={setRacaCor}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
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
                            <div className="space-y-2">
                              <Label className="text-sm">Estado Civil</Label>
                              <Select value={estadoCivil} onValueChange={setEstadoCivil}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                                  <SelectItem value="casado">Casado(a)</SelectItem>
                                  <SelectItem value="separado">Separado(a)</SelectItem>
                                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                                  <SelectItem value="uniao_estavel">União estável</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {contractType === "PJ" && (
                      <div className="space-y-2">
                        <Label>Modelo de Remuneração</Label>
                        <Select value={compensationType} onValueChange={setCompensationType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o modelo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixo Mensal</SelectItem>
                            <SelectItem value="hourly">Hora/Hora</SelectItem>
                            <SelectItem value="variable_goal">Variável por Meta</SelectItem>
                            <SelectItem value="variable_deliverable">Variável por Entregável</SelectItem>
                            <SelectItem value="mixed">Misto (Fixo + Variável)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>
                        {contractType === "PJ" && compensationType === "hourly" ? "Valor por Hora" :
                         contractType === "PJ" && compensationType === "variable_goal" ? "Valor da Meta" :
                         contractType === "PJ" && compensationType === "variable_deliverable" ? "Valor por Entregável" :
                         contractType === "PJ" && compensationType === "mixed" ? "Parte Fixa Mensal" :
                         "Salário"}
                      </Label>
                      <Input
                        type="text"
                        placeholder="R$ 0,00"
                        value={salary}
                        onChange={(e) => setSalary(formatCurrencyMask(e.target.value))}
                      />
                    </div>
                    {contractType === "PJ" && compensationType === "mixed" && (
                      <div className="space-y-2">
                        <Label>Parte Variável (teto)</Label>
                        <Input
                          type="text"
                          placeholder="R$ 0,00"
                          value={variableComponent}
                          onChange={(e) => setVariableComponent(formatCurrencyMask(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">Valor máximo da parte variável do modelo misto</p>
                      </div>
                    )}
                    {contractType === "PJ" && (compensationType === "variable_goal" || compensationType === "variable_deliverable") && (
                      <div className="space-y-2">
                        <Label>{compensationType === "variable_goal" ? "Descrição da Meta" : "Descrição do Entregável"}</Label>
                        <Textarea
                          placeholder={compensationType === "variable_goal" ? "Descreva a meta, critérios e prazo..." : "Descreva o entregável, critérios de aceite e prazo..."}
                          value={goalDescription}
                          onChange={(e) => setGoalDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                    )}
                    {/* Summary of step 1 */}
                    <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Resumo da Etapa 1</p>
                      <p><span className="text-muted-foreground">Colaborador:</span> {profiles.find(p => p.user_id === selectedUserId)?.full_name || "-"}</p>
                      <p><span className="text-muted-foreground">Tipo:</span> {getContractTypeLabel(contractType)}</p>
                      <p><span className="text-muted-foreground">Início:</span> {startDate ? format(new Date(startDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
                    </div>
                  </>
                )}

                {/* Step 3: Financeiro (PJ only) */}
                {step === 3 && contractType === "PJ" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Periodicidade de Pagamento</Label>
                        <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a periodicidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="biweekly">Quinzenal</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="per_delivery">Por Entrega</SelectItem>
                            <SelectItem value="single">Pagamento Único</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Dia de Vencimento</Label>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          placeholder="Ex: 5"
                          value={paymentDay}
                          onChange={(e) => setPaymentDay(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Dia do mês (1–28)</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Índice de Reajuste</Label>
                      <Select value={adjustmentIndex} onValueChange={setAdjustmentIndex}>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum reajuste" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="IGPM">IGP-M</SelectItem>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="INPC">INPC</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {adjustmentIndex && adjustmentIndex !== "none" && (
                      <div className="space-y-2">
                        <Label className="text-sm">Data-base do Reajuste</Label>
                        <Input
                          type="date"
                          value={adjustmentDate}
                          onChange={(e) => setAdjustmentDate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Data anual em que o reajuste é aplicado</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm">Escopo do Serviço</Label>
                      <Textarea
                        placeholder="Descreva o escopo do serviço, SLAs, entregas esperadas..."
                        value={scopeDescription}
                        onChange={(e) => setScopeDescription(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">Detalhamento do serviço prestado (usado no documento final)</p>
                    </div>

                    {/* Split / Beneficiaries */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Split de Pagamento</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs h-7"
                          onClick={() => setSplits(prev => [...prev, { name: "", document: "", percentage: "" }])}
                        >
                          <UserPlus className="h-3 w-3" />
                          Adicionar beneficiário
                        </Button>
                      </div>
                      {splits.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 rounded-lg border border-dashed text-center">
                          Sem split — pagamento integral ao prestador. Clique acima para dividir.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {splits.map((split, index) => (
                            <div key={index} className="flex items-end gap-2 p-3 rounded-lg border bg-muted/30">
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs">Nome</Label>
                                <Input
                                  placeholder="Nome do beneficiário"
                                  value={split.name}
                                  className="h-8 text-sm"
                                  onChange={(e) => {
                                    const updated = [...splits];
                                    updated[index].name = e.target.value;
                                    setSplits(updated);
                                  }}
                                />
                              </div>
                              <div className="w-40 space-y-1">
                                <Label className="text-xs">CPF/CNPJ</Label>
                                <Input
                                  placeholder="Documento"
                                  value={split.document}
                                  className="h-8 text-sm"
                                  onChange={(e) => {
                                    const updated = [...splits];
                                    updated[index].document = e.target.value;
                                    setSplits(updated);
                                  }}
                                />
                              </div>
                              <div className="w-20 space-y-1">
                                <Label className="text-xs">%</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  min="1"
                                  max="100"
                                  value={split.percentage}
                                  className="h-8 text-sm"
                                  onChange={(e) => {
                                    const updated = [...splits];
                                    updated[index].percentage = e.target.value;
                                    setSplits(updated);
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => setSplits(prev => prev.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          {(() => {
                            const total = splits.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0);
                            return (
                              <div className={`text-xs text-right font-medium ${total === 100 ? "text-green-600" : total > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                                Total: {total.toFixed(1)}%{total !== 100 && " (deve somar 100%)"}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Summary of step 2 */}
                    <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Resumo da Etapa 2</p>
                      <p><span className="text-muted-foreground">Cargo:</span> {jobTitle || "-"}</p>
                      <p><span className="text-muted-foreground">Salário:</span> {salary || "Não informado"}</p>
                    </div>
                  </div>
                )}

                {/* Step 4: Documento PJ (only for PJ contracts) */}
                {step === 4 && contractType === "PJ" && (
                  <div className="space-y-4">
                    {/* Template Selection */}
                    <div className="space-y-2">
                      <Label className={validationErrors.template ? "text-destructive" : ""}>
                        Template do Contrato <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={selectedTemplateId} 
                        onValueChange={(value) => {
                          setSelectedTemplateId(value);
                          if (value) setValidationErrors(prev => ({ ...prev, template: false }));
                        }}
                      >
                        <SelectTrigger className={validationErrors.template ? "ring-2 ring-destructive" : ""}>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} {template.is_system_default && "(Padrão)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {templates.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Nenhum template disponível. Crie um template primeiro.
                        </p>
                      )}
                      {validationErrors.template && (
                        <p className="text-xs text-destructive">Selecione um template</p>
                      )}
                      {/* Template Preview */}
                      {selectedTemplateId && (() => {
                        const tpl = templates.find(t => t.id === selectedTemplateId);
                        if (!tpl) return null;
                        return (
                          <div className="mt-2 rounded-lg border bg-muted/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground">Prévia do template</p>
                              <Badge variant="outline" className="text-[10px]">
                                {tpl.default_witness_count} testemunha(s)
                              </Badge>
                            </div>
                            <div
                              className="prose prose-sm max-w-none text-xs max-h-[200px] overflow-y-auto p-3 bg-white dark:bg-background rounded border"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(tpl.content.substring(0, 2000) + (tpl.content.length > 2000 ? "..." : "")),
                              }}
                            />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Company Representative Selection */}
                    <div className="space-y-2">
                      <Label className={validationErrors.representante ? "text-destructive" : ""}>
                        Representante da Empresa (Assinante) <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={selectedRepresentativeId} 
                        onValueChange={(value) => {
                          setSelectedRepresentativeId(value);
                          if (value) setValidationErrors(prev => ({ ...prev, representante: false }));
                        }}
                      >
                        <SelectTrigger className={validationErrors.representante ? "ring-2 ring-destructive" : ""}>
                          <SelectValue placeholder="Selecione o administrador assinante" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminProfiles.map((admin) => (
                            <SelectItem key={admin.user_id} value={admin.user_id}>
                              {admin.full_name} ({admin.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {adminProfiles.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Nenhum administrador encontrado.
                        </p>
                      )}
                      {validationErrors.representante && (
                        <p className="text-xs text-destructive">Selecione um representante</p>
                      )}
                      {selectedRepresentativeId && (() => {
                        const selectedAdmin = adminProfiles.find(a => a.user_id === selectedRepresentativeId);
                        const missingFields: string[] = [];
                        if (!selectedAdmin?.nationality) missingFields.push("nacionalidade");
                        if (!selectedAdmin?.marital_status) missingFields.push("estado civil");
                        if (!selectedAdmin?.birth_date) missingFields.push("data de nascimento");
                        if (!selectedAdmin?.profession) missingFields.push("profissão");
                        if (!selectedAdmin?.identity_number) missingFields.push("RG");
                        if (!selectedAdmin?.cpf) missingFields.push("CPF");
                        
                        if (missingFields.length > 0) {
                          return (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              ⚠️ Dados incompletos do representante: {missingFields.join(", ")}. 
                              Para um contrato completo, atualize o perfil do administrador.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Contractor Data Type Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">Dados do Contratado no Documento</Label>
                      <Select value={contractorDataType} onValueChange={(value: "pj" | "pf") => setContractorDataType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pj">Somente PJ (CNPJ e Razão Social)</SelectItem>
                          <SelectItem value="pf">PJ + Pessoa Física (CNPJ, Razão Social, Nome e CPF)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Witness Count */}
                    <div className="space-y-2">
                      <Label className="text-sm">Quantidade de Testemunhas</Label>
                      <Select value={witnessCount} onValueChange={setWitnessCount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sem testemunhas</SelectItem>
                          <SelectItem value="1">1 testemunha</SelectItem>
                          <SelectItem value="2">2 testemunhas</SelectItem>
                          <SelectItem value="3">3 testemunhas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration Type */}
                    <div className="space-y-2">
                      <Label className="text-sm">Tipo de Duração</Label>
                      <Select value={durationType} onValueChange={setDurationType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indefinite">Indeterminado</SelectItem>
                          <SelectItem value="time_based">Por Tempo</SelectItem>
                          <SelectItem value="delivery_based">Por Entrega</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {durationType === "time_based" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Quantidade</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 12"
                            value={durationValue}
                            onChange={(e) => setDurationValue(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Unidade</Label>
                          <Select value={durationUnit} onValueChange={setDurationUnit}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Dias</SelectItem>
                              <SelectItem value="weeks">Semanas</SelectItem>
                              <SelectItem value="months">Meses</SelectItem>
                              <SelectItem value="years">Anos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {durationType === "delivery_based" && (
                      <div className="space-y-2">
                        <Label className="text-sm">Descrição da Entrega</Label>
                        <Input
                          placeholder="Ex: Desenvolvimento do app mobile"
                          value={deliverableDescription}
                          onChange={(e) => setDeliverableDescription(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Preview do contrato final (PJ only) */}
                {step === 5 && contractType === "PJ" && (() => {
                  const tpl = templates.find(t => t.id === selectedTemplateId);
                  const collaboratorProfile = profiles.find(p => p.user_id === selectedUserId);
                  const representativeProfile = adminProfiles.find(a => a.user_id === selectedRepresentativeId) || null;
                  if (!tpl || !collaboratorProfile) return (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Selecione um template e um colaborador para ver o preview.</p>
                    </div>
                  );

                  // Build insertData mock for preview
                  let endDate: string | null = null;
                  if (durationType === "time_based" && durationValue) {
                    const [y, m, d] = startDate.split('-').map(Number);
                    const start = new Date(y, m - 1, d);
                    const value = parseInt(durationValue);
                    if (durationUnit === "days") start.setDate(start.getDate() + value);
                    else if (durationUnit === "weeks") start.setDate(start.getDate() + (value * 7));
                    else if (durationUnit === "months") start.setMonth(start.getMonth() + value);
                    else if (durationUnit === "years") start.setFullYear(start.getFullYear() + value);
                    endDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
                  }

                  const mockData = {
                    job_title: jobTitle,
                    department: null,
                    salary: salary ? parseCurrency(salary) : null,
                    start_date: startDate,
                    end_date: endDate,
                  };

                  const previewHtml = generateDocumentHtml(tpl, mockData, collaboratorProfile, representativeProfile, parseInt(witnessCount), contractorDataType === "pf");

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Preview do Contrato Final</Label>
                        <Badge variant="outline" className="text-[10px]">Somente leitura</Badge>
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-xs max-h-[400px] overflow-y-auto p-4 bg-white dark:bg-background rounded-lg border shadow-inner"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
                      />
                      <p className="text-[11px] text-muted-foreground text-center">
                        Verifique o documento acima antes de confirmar a criação do contrato.
                      </p>
                    </div>
                  );
                })()}
              </div>
              <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <div className="flex w-full justify-between">
                  <div>
                    {step > 1 && (
                      <Button variant="outline" onClick={handlePrevStep}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Voltar
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      Cancelar
                    </Button>
                    {step < totalSteps ? (
                      <Button onClick={handleNextStep}>
                        Próximo
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={handleCreateContract} disabled={isSubmitting}>
                        {isSubmitting ? "Criando..." : "Criar Contrato"}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contratos</CardTitle>
              <CardDescription>
                {filteredContratos.length === contratos.length
                  ? `${contratos.length} contrato(s)`
                  : `${filteredContratos.length} de ${contratos.length} contrato(s)`}
                {totalContratosPages > 1 && ` · pág. ${currentPage}/${totalContratosPages}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("list")}
                    aria-label="Modo lista"
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Modo lista</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "kanban" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("kanban")}
                    aria-label="Modo Kanban"
                  >
                    <Columns3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Modo Kanban</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={fullTextMode ? "Busca inteligente (mín. 3 caracteres)..." : "Buscar por nome ou cargo..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={fullTextMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => { setFullTextMode((v) => !v); setSearchTerm(""); }}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  {fullTextMode ? "Busca inteligente ON" : "Busca inteligente"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Busca full-text no banco de dados</TooltipContent>
            </Tooltip>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Vigente</SelectItem>
                <SelectItem value="pending_signature">Aguardando assinatura</SelectItem>
                <SelectItem value="em_revisao">Em Revisão</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="renovado">Renovado</SelectItem>
                <SelectItem value="terminated">Encerrado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="CLT">CLT</SelectItem>
                <SelectItem value="PJ">PJ</SelectItem>
                <SelectItem value="estagio">Estágio</SelectItem>
                <SelectItem value="temporario">Temporário</SelectItem>
              </SelectContent>
            </Select>
            {expiringContractsCount > 0 && (
              <Button
                variant={quickFilter === "expiring30" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickFilter(quickFilter === "expiring30" ? "" : "expiring30")}
                className="gap-1.5 text-xs"
              >
                <AlertTriangle className="h-3 w-3" />
                Vencendo em 30 dias ({expiringContractsCount})
              </Button>
            )}
            {noPaymentContracts.size > 0 && (
              <Button
                variant={quickFilter === "noPayment" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickFilter(quickFilter === "noPayment" ? "" : "noPayment")}
                className="gap-1.5 text-xs"
              >
                Sem pagamento ({noPaymentContracts.size})
              </Button>
            )}
            {(statusFilter !== "all" || typeFilter !== "all" || quickFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setQuickFilter("");
                }}
                className="text-muted-foreground"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="rounded-md border">
            {viewMode === "list" ? (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Valor</TableHead>
                  <TableHead className="hidden xl:table-cell">Duração</TableHead>
                  <TableHead className="hidden lg:table-cell">Término</TableHead>
                  <TableHead className="hidden md:table-cell">Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredContratos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Nenhum contrato encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedContratos.map((contrato) => {
                    const durationInfo = getDurationDisplay(contrato);
                    const expirationAlert = getExpirationAlert(contrato);
                    return (
                      <TableRow 
                        key={contrato.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${expirationAlert ? 'bg-amber-500/5' : ''}`} 
                        onClick={() => navigate(`/dashboard/contratos/${contrato.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">{contrato.profile?.full_name || "-"}</p>
                              <p className="text-sm text-muted-foreground">
                                {contrato.profile?.email}
                              </p>
                            </div>
                            {overdueContracts.has(contrato.id) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    <DollarSign className="h-3 w-3" />
                                    Atraso
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Pagamento em atraso para este contrato</TooltipContent>
                              </Tooltip>
                            )}
                            {expirationAlert && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${expirationAlert.color}`}>
                                    <AlertTriangle className="h-3 w-3" />
                                    {expirationAlert.level === "expired" 
                                      ? `Expirado há ${expirationAlert.days}d`
                                      : `${expirationAlert.days}d`
                                    }
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {expirationAlert.level === "expired" 
                                    ? `Contrato expirado há ${expirationAlert.days} dia(s)`
                                    : `Contrato expira em ${expirationAlert.days} dia(s)`
                                  }
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            {contrato.job_title}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">
                            {getContractTypeLabel(contrato.contract_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="font-medium text-sm">
                            {formatCurrency(contrato.salary)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {durationInfo ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{durationInfo.label}</span>
                              </div>
                              {durationInfo.detail && (
                                <p className="text-xs text-muted-foreground mt-0.5">{durationInfo.detail}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {contrato.end_date ? (
                            <div className={`flex items-center gap-1 text-sm ${expirationAlert ? 'font-medium' : ''}`}>
                              <Calendar className={`h-3 w-3 ${expirationAlert ? (expirationAlert.level === 'critical' || expirationAlert.level === 'expired' ? 'text-destructive' : 'text-amber-500') : 'text-muted-foreground'}`} />
                              <span className={expirationAlert ? (expirationAlert.level === 'critical' || expirationAlert.level === 'expired' ? 'text-destructive' : 'text-amber-600') : ''}>
                                {format(new Date(contrato.end_date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem término</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(contrato.start_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const expAlert = getExpirationAlert(contrato);
                            if (expAlert && expAlert.level !== "expired") {
                              return (
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                  Vencendo ({expAlert.days}d)
                                </Badge>
                              );
                            }
                            return (
                              <Badge 
                                variant="outline"
                                className={getStatusClassName(contrato.status)}
                              >
                                {getStatusLabel(contrato.status)}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" aria-label="Mais opções">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/contratos/${contrato.id}`); }}>
                                <FileText className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleGeneratePDF(contrato); }}>
                                <Printer className="mr-2 h-4 w-4" />
                                Gerar PDF
                              </DropdownMenuItem>
                              {isAdmin() && (
                                <>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRenewContract(contrato); }}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Renovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Editar</DropdownMenuItem>
                                  {contrato.status === "active" && (
                                    <DropdownMenuItem 
                                      className="text-destructive" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setContractToTerminate(contrato);
                                        setIsTerminateDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Encerrar
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {/* Pagination */}
            {totalContratosPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Exibindo {(currentPage - 1) * CONTRATOS_PER_PAGE + 1}–{Math.min(currentPage * CONTRATOS_PER_PAGE, filteredContratos.length)} de {filteredContratos.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalContratosPages }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalContratosPages)
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "…" ? (
                        <span key={`e${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                      ) : (
                        <Button key={item} variant={currentPage === item ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setCurrentPage(item as number)}>
                          {item}
                        </Button>
                      )
                    )}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalContratosPages} onClick={() => setCurrentPage(p => Math.min(totalContratosPages, p + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
            ) : (
            /* Kanban View */
              <div className="p-4">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                      { key: "pending_signature", label: "Aguardando Assinatura", color: "border-yellow-500", bgHeader: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
                      { key: "active", label: "Vigente", color: "border-blue-500", bgHeader: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
                      { key: "em_revisao", label: "Em Revisão", color: "border-orange-500", bgHeader: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
                      { key: "suspended", label: "Suspenso", color: "border-slate-400", bgHeader: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
                      { key: "expiring", label: "Vencendo", color: "border-amber-500", bgHeader: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
                      { key: "terminated", label: "Encerrado", color: "border-gray-400", bgHeader: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
                      { key: "renovado", label: "Renovado", color: "border-teal-500", bgHeader: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
                    ].map((column) => {
                      const columnContratos = filteredContratos.filter((c) => {
                        if (column.key === "expiring") {
                          return c.status === "active" && !!getExpirationAlert(c);
                        }
                        if (column.key === "active") {
                          return c.status === "active" && !getExpirationAlert(c);
                        }
                        return c.status === column.key;
                      });
                      return (
                        <div key={column.key} className={`rounded-lg border-t-2 ${column.color} bg-muted/30`}>
                          <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${column.bgHeader}`}>
                            <span className="text-sm font-semibold">{column.label}</span>
                            <Badge variant="secondary" className="text-xs">{columnContratos.length}</Badge>
                          </div>
                          <div className="p-2 space-y-2 min-h-[100px] max-h-[500px] overflow-y-auto">
                            {columnContratos.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-6">Nenhum contrato</p>
                            ) : (
                              columnContratos.map((contrato) => {
                                const expirationAlert = getExpirationAlert(contrato);
                                return (
                                  <div
                                    key={contrato.id}
                                    className="p-3 rounded-lg bg-background border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => navigate(`/dashboard/contratos/${contrato.id}`)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="font-medium text-sm leading-tight">{contrato.profile?.full_name || "-"}</p>
                                      {expirationAlert && (
                                        <div className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${expirationAlert.color}`}>
                                          {expirationAlert.days}d
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">{contrato.job_title}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {getContractTypeLabel(contrato.contract_type)}
                                      </Badge>
                                      {contrato.salary ? (
                                        <span className="text-xs font-medium">{formatCurrency(contrato.salary)}</span>
                                      ) : null}
                                    </div>
                                    {contrato.end_date && (
                                      <div className="flex items-center gap-1 mt-1.5">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[11px] text-muted-foreground">
                                          {format(new Date(contrato.end_date), "dd/MM/yyyy", { locale: ptBR })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total comprometido */}
          {!isLoading && contratos.length > 0 && (
            <div className="flex items-center justify-between mt-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Total comprometido mensal (contratos vigentes):</span>
              </div>
              <span className="font-bold text-lg">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalComprometido)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Terminate Contract Dialog */}
      <AlertDialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar o contrato de{" "}
              <span className="font-medium text-foreground">
                {contractToTerminate?.profile?.full_name}
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateContract}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Encerrando..." : "Encerrar Contrato"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contratos;
