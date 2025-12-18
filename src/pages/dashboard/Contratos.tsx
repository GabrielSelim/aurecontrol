import { useEffect, useState } from "react";
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
} from "lucide-react";
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
}

const Contratos = () => {
  const { profile, isAdmin } = useAuth();
  const [contratos, setContratos] = useState<Contract[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchContratos();
    fetchProfiles();
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
        .select("user_id, full_name, email")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handleCreateContract = async () => {
    if (!profile?.company_id || !selectedUserId || !contractType || !jobTitle || !startDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate end_date for time-based contracts
      let endDate = null;
      if (contractType === "pj" && durationType === "time_based" && durationValue) {
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

      const { error } = await supabase.from("contracts").insert({
        company_id: profile.company_id,
        user_id: selectedUserId,
        contract_type: contractType as "CLT" | "PJ",
        job_title: jobTitle,
        department: department || null,
        salary: salary ? parseFloat(salary) : null,
        start_date: startDate,
        end_date: endDate,
        status: "active",
        created_by: profile.user_id,
        duration_type: contractType === "pj" ? durationType : null,
        duration_value: contractType === "pj" && durationType === "time_based" ? parseInt(durationValue) : null,
        duration_unit: contractType === "pj" && durationType === "time_based" ? durationUnit : null,
        deliverable_description: contractType === "pj" && durationType === "delivery_based" ? deliverableDescription : null,
      });
      if (error) throw error;

      toast.success("Contrato criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      fetchContratos();
    } catch (error) {
      console.error("Error creating contract:", error);
      toast.error("Erro ao criar contrato");
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
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      clt: "CLT",
      pj: "PJ",
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

  const filteredContratos = contratos.filter(
    (c) =>
      c.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
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
                        <SelectItem value="clt">CLT</SelectItem>
                        <SelectItem value="pj">PJ</SelectItem>
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
                {/* PJ Duration Options */}
                {contractType === "pj" && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <Label className="text-sm font-medium">Duração do Contrato PJ</Label>
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
                  <TableHead className="hidden lg:table-cell">Salário</TableHead>
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
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredContratos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Nenhum contrato encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContratos.map((contrato) => (
                    <TableRow key={contrato.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contrato.profile?.full_name || "-"}</p>
                          <p className="text-sm text-muted-foreground">
                            {contrato.profile?.email}
                          </p>
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
                        {formatCurrency(contrato.salary)}
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
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            {isAdmin() && (
                              <>
                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Encerrar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contratos;
