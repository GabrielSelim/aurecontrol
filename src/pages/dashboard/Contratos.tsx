import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  duration_type: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  deliverable_description: string | null;
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
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [contratos, setContratos] = useState<Contract[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [contractToTerminate, setContractToTerminate] = useState<Contract | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [contractType, setContractType] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  // PJ duration fields
  const [durationType, setDurationType] = useState("indefinite");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("months");
  const [deliverableDescription, setDeliverableDescription] = useState("");
  // PJ document fields
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [witnessCount, setWitnessCount] = useState("0");

  useEffect(() => {
    fetchContratos();
    fetchProfiles();
    fetchTemplates();
  }, [profile?.company_id]);

  const fetchContratos = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile info for each contract
      const contratosWithProfiles = await Promise.all(
        (data || []).map(async (contract) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", contract.user_id)
            .single();

          return {
            ...contract,
            profile: profileData || undefined,
          };
        })
      );

      setContratos(contratosWithProfiles);
    } catch (error) {
      console.error("Error fetching contratos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, cpf, pj_cnpj, pj_razao_social")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchTemplates = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("id, name, description, content, default_witness_count, is_system_default")
        .or(`company_id.eq.${profile.company_id},is_system_default.eq.true`)
        .eq("is_active", true)
        .order("is_system_default", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
      
      // Auto-select default template
      const defaultTemplate = (data || []).find(t => t.is_system_default);
      if (defaultTemplate && !selectedTemplateId) {
        setSelectedTemplateId(defaultTemplate.id);
        setWitnessCount(String(defaultTemplate.default_witness_count || 0));
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const generateDocumentHtml = (template: ContractTemplate, contractData: any, collaboratorProfile: Profile) => {
    const company = profile;
    let html = template.content;

    // Replace template variables
    const variables: Record<string, string> = {
      "{{contratante_razao_social}}": company?.company_id || "Empresa",
      "{{contratante_cnpj}}": "",
      "{{contratante_endereco}}": "",
      "{{contratado_nome}}": collaboratorProfile.pj_razao_social || collaboratorProfile.full_name,
      "{{contratado_cpf_cnpj}}": collaboratorProfile.pj_cnpj || collaboratorProfile.cpf || "",
      "{{contratado_endereco}}": "",
      "{{cargo}}": contractData.job_title,
      "{{valor}}": contractData.salary ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(contractData.salary) : "A definir",
      "{{data_inicio}}": format(new Date(contractData.start_date), "dd/MM/yyyy", { locale: ptBR }),
      "{{data_fim}}": contractData.end_date ? format(new Date(contractData.end_date), "dd/MM/yyyy", { locale: ptBR }) : "Indeterminado",
      "{{data_atual}}": format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      "{{cidade}}": "Cidade",
    };

    Object.entries(variables).forEach(([key, value]) => {
      html = html.replace(new RegExp(key, "g"), value);
    });

    return html;
  };

  const handleCreateContract = async () => {
    if (!profile?.company_id || !selectedUserId || !contractType || !jobTitle || !startDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // PJ contracts require template selection
    if (contractType === "PJ" && !selectedTemplateId) {
      toast.error("Selecione um template de contrato para contratos PJ");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate end_date for time-based contracts
      let endDate = null;
      if (contractType === "PJ" && durationType === "time_based" && durationValue) {
        const start = new Date(startDate);
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
        endDate = start.toISOString().split('T')[0];
      }

      const insertData = {
        company_id: profile.company_id,
        user_id: selectedUserId,
        contract_type: contractType as "CLT" | "PJ" | "estagio" | "temporario",
        job_title: jobTitle,
        department: department || null,
        salary: salary ? parseFloat(salary) : null,
        start_date: startDate,
        end_date: endDate,
        status: "active" as const,
        created_by: profile.user_id,
        duration_type: contractType === "PJ" ? durationType : null,
        duration_value: contractType === "PJ" && durationType === "time_based" && durationValue ? parseInt(durationValue) : null,
        duration_unit: contractType === "PJ" && durationType === "time_based" ? durationUnit : null,
        deliverable_description: contractType === "PJ" && durationType === "delivery_based" ? deliverableDescription : null,
      };

      console.log("Inserting contract:", insertData);

      const { data: contractData, error } = await supabase
        .from("contracts")
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // For PJ contracts, generate the document
      if (contractType === "PJ" && selectedTemplateId && contractData) {
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        const collaboratorProfile = profiles.find(p => p.user_id === selectedUserId);
        
        if (selectedTemplate && collaboratorProfile) {
          const documentHtml = generateDocumentHtml(selectedTemplate, { ...insertData, end_date: endDate }, collaboratorProfile);
          
          const { error: docError } = await supabase
            .from("contract_documents")
            .insert({
              contract_id: contractData.id,
              template_id: selectedTemplateId,
              document_html: documentHtml,
              witness_count: parseInt(witnessCount),
              signature_status: "pending",
            });

          if (docError) {
            console.error("Error creating document:", docError);
            toast.error("Contrato criado, mas houve erro ao gerar o documento");
          }
        }
      }

      toast.success("Contrato criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      fetchContratos();
    } catch (error: any) {
      console.error("Error creating contract:", error);
      toast.error(error?.message || "Erro ao criar contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId("");
    setContractType("");
    setJobTitle("");
    setDepartment("");
    setSalary("");
    setStartDate("");
    setDurationType("indefinite");
    setDurationValue("");
    setDurationUnit("months");
    setDeliverableDescription("");
    setSelectedTemplateId("");
    setWitnessCount("0");
  };

  const handleTerminateContract = async () => {
    if (!contractToTerminate) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ status: "terminated" as const })
        .eq("id", contractToTerminate.id);

      if (error) throw error;

      toast.success("Contrato encerrado com sucesso!");
      setIsTerminateDialogOpen(false);
      setContractToTerminate(null);
      fetchContratos();
    } catch (error: any) {
      console.error("Error terminating contract:", error);
      toast.error(error?.message || "Erro ao encerrar contrato");
    } finally {
      setIsSubmitting(false);
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
      active: "Ativo",
      suspended: "Suspenso",
      terminated: "Encerrado",
      expired: "Expirado",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
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

  const filteredContratos = contratos.filter(
    (c) =>
      c.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {isAdmin() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Contrato</DialogTitle>
                <DialogDescription>
                  Preencha as informações do contrato
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Colaborador *</Label>
                  <ProfileCombobox
                    profiles={profiles}
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="Selecione um colaborador"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Contrato *</Label>
                    <Select value={contractType} onValueChange={setContractType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                        <SelectItem value="estagio">Estágio</SelectItem>
                        <SelectItem value="temporario">Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Início *</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
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
                {/* PJ Duration Options */}
                {contractType === "PJ" && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <Label className="text-sm font-medium">Configurações do Contrato PJ</Label>
                    
                    {/* Template Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Template do Contrato *</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger>
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
                    </div>

                    {/* Witness Count */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantidade de Testemunhas</Label>
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
                      <Label className="text-xs text-muted-foreground">Tipo de Duração</Label>
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
                          <Label className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 12"
                            value={durationValue}
                            onChange={(e) => setDurationValue(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Unidade</Label>
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
                        <Label className="text-xs text-muted-foreground">Descrição da Entrega</Label>
                        <Input
                          placeholder="Ex: Desenvolvimento do app mobile"
                          value={deliverableDescription}
                          onChange={(e) => setDeliverableDescription(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Cargo *</Label>
                  <JobTitleCombobox
                    value={jobTitle}
                    onChange={setJobTitle}
                    placeholder="Selecione ou digite um cargo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Input
                      placeholder="Ex: Tecnologia"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salário</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateContract} disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Criar Contrato"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contratos</CardTitle>
          <CardDescription>
            {contratos.length} contrato(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
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
                      <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredContratos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Nenhum contrato encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContratos.map((contrato) => {
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
                          <Badge variant={getStatusBadgeVariant(contrato.status)}>
                            {getStatusLabel(contrato.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/contratos/${contrato.id}`); }}>
                                Ver detalhes
                              </DropdownMenuItem>
                              {isAdmin() && (
                                <>
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
          </div>
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
