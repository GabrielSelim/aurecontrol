import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCompanyFull, updateCompany, uploadCompanyLogo } from "@/services/companyService";
import { fetchActiveTemplatesByCompany, fetchContractsByCompany } from "@/services/contractService";
import { countActiveProfilesByCompany } from "@/services/profileService";
import { countPaymentsByCompany } from "@/services/paymentService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Mail, Phone, Save, Users, FileText, CreditCard, Upload, User, Shield, Landmark, Loader2, Settings, MailOpen, Plug, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useCepLookup } from "@/hooks/useCepLookup";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/handleApiError";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  logo_url: string | null;
  is_active: boolean;
  legal_rep_name: string | null;
  legal_rep_cpf: string | null;
  legal_rep_rg: string | null;
  legal_rep_rg_issuer: string | null;
  legal_rep_nationality: string | null;
  legal_rep_profession: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  default_template_id: string | null;
  default_witness_count: number | null;
  default_adjustment_policy: string | null;
  welcome_email_template: string | null;
  plan_name: string | null;
  max_collaborators: number | null;
  plan_expires_at: string | null;
}

interface CompanyStats {
  colaboradores: number;
  contratosAtivos: number;
  pagamentosMes: number;
}

const Empresa = () => {
  useDocumentTitle("Empresa");
  const { profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<CompanyStats>({ colaboradores: 0, contratosAtivos: 0, pagamentosMes: 0 });

  // Form state
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressCep, setAddressCep] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Legal representative state
  const [legalRepName, setLegalRepName] = useState("");
  const [legalRepCpf, setLegalRepCpf] = useState("");
  const [legalRepRg, setLegalRepRg] = useState("");
  const [legalRepRgIssuer, setLegalRepRgIssuer] = useState("");
  const [legalRepNationality, setLegalRepNationality] = useState("");
  const [legalRepProfession, setLegalRepProfession] = useState("");

  // Bank data state
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountType, setBankAccountType] = useState("corrente");

  // Contract config state
  const [defaultTemplateId, setDefaultTemplateId] = useState("none");
  const [defaultWitnessCount, setDefaultWitnessCount] = useState("2");
  const [defaultAdjustmentPolicy, setDefaultAdjustmentPolicy] = useState("none");
  const [availableTemplates, setAvailableTemplates] = useState<{id: string; name: string}[]>([]);

  // Welcome email state
  const [welcomeEmailTemplate, setWelcomeEmailTemplate] = useState("");

  // Plan state
  const [planName, setPlanName] = useState("starter");
  const [maxCollaborators, setMaxCollaborators] = useState(10);
  const [planExpiresAt, setPlanExpiresAt] = useState("");

  const { formatCep, lookupCep, isLoading: isLoadingCep } = useCepLookup();

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value);
    setAddressCep(formatted);
    const cleanCep = value.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      const result = await lookupCep(cleanCep);
      if (result) {
        setAddressStreet(result.street);
        setAddressNeighborhood(result.neighborhood);
        setAddressCity(result.city);
        setAddressState(result.state);
        if (result.complement) setAddressComplement(result.complement);
      }
    }
  };

  useEffect(() => {
    const fetchCompany = async () => {
      if (!profile?.company_id) return;

      try {
        const data = await fetchCompanyFull(profile.company_id);
        setCompany(data);
        setName(data.name);
        setCnpj(formatCNPJ(data.cnpj));
        setEmail(data.email || "");
        setPhone(data.phone ? formatPhone(data.phone) : "");
        setAddressCep(data.address_cep || "");
        setAddressStreet(data.address_street || "");
        setAddressNumber(data.address_number || "");
        setAddressComplement(data.address_complement || "");
        setAddressNeighborhood(data.address_neighborhood || "");
        setAddressCity(data.address_city || "");
        setAddressState(data.address_state || "");
        setLogoUrl(data.logo_url || null);
        setLegalRepName(data.legal_rep_name || "");
        setLegalRepCpf(data.legal_rep_cpf || "");
        setLegalRepRg(data.legal_rep_rg || "");
        setLegalRepRgIssuer(data.legal_rep_rg_issuer || "");
        setLegalRepNationality(data.legal_rep_nationality || "");
        setLegalRepProfession(data.legal_rep_profession || "");
        setBankName(data.bank_name || "");
        setBankAgency(data.bank_agency || "");
        setBankAccount(data.bank_account || "");
        setBankAccountType(data.bank_account_type || "corrente");
        setDefaultTemplateId(data.default_template_id || "none");
        setDefaultWitnessCount(String(data.default_witness_count ?? 2));
        setDefaultAdjustmentPolicy(data.default_adjustment_policy || "none");
        setWelcomeEmailTemplate(data.welcome_email_template || "");
        setPlanName(data.plan_name || "starter");
        setMaxCollaborators(data.max_collaborators ?? 10);
        setPlanExpiresAt(data.plan_expires_at || "");

        // Fetch available templates
        const templatesData = await fetchActiveTemplatesByCompany(profile.company_id, "id, name");
        setAvailableTemplates(templatesData);

        // Fetch real stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [colaboradoresCount, activeContracts, pagamentosMesCount] = await Promise.all([
          countActiveProfilesByCompany(profile.company_id),
          fetchContractsByCompany(profile.company_id, { status: "active" }),
          countPaymentsByCompany(profile.company_id, { fromDate: startOfMonth.toISOString() }),
        ]);

        setStats({
          colaboradores: colaboradoresCount,
          contratosAtivos: activeContracts.length,
          pagamentosMes: pagamentosMesCount,
        });
      } catch (error) {
        logger.error("Error fetching company:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [profile?.company_id]);

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})/, "$1-$2")
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  const handleSave = async () => {
    if (!company) return;

    setIsSaving(true);

    try {
      await updateCompany(company.id, {
          name,
          email: email || null,
          phone: phone.replace(/\D/g, "") || null,
          address: [addressStreet, addressNumber, addressNeighborhood, addressCity, addressState].filter(Boolean).join(", ") || null,
          address_cep: addressCep.replace(/\D/g, "") || null,
          address_street: addressStreet || null,
          address_number: addressNumber || null,
          address_complement: addressComplement || null,
          address_neighborhood: addressNeighborhood || null,
          address_city: addressCity || null,
          address_state: addressState || null,
          logo_url: logoUrl,
          legal_rep_name: legalRepName || null,
          legal_rep_cpf: legalRepCpf || null,
          legal_rep_rg: legalRepRg || null,
          legal_rep_rg_issuer: legalRepRgIssuer || null,
          legal_rep_nationality: legalRepNationality || null,
          legal_rep_profession: legalRepProfession || null,
          bank_name: bankName || null,
          bank_agency: bankAgency || null,
          bank_account: bankAccount || null,
          bank_account_type: bankAccountType || null,
          default_template_id: defaultTemplateId === "none" ? null : defaultTemplateId || null,
          default_witness_count: parseInt(defaultWitnessCount) || 2,
          default_adjustment_policy: defaultAdjustmentPolicy === "none" ? null : defaultAdjustmentPolicy || null,
          welcome_email_template: welcomeEmailTemplate || null,
        });

      toast.success("Dados salvos com sucesso!");
    } catch (error) {
      logger.error("Error saving company:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${company.id}/logo.${ext}`;

      const publicUrl = await uploadCompanyLogo(path, file);

      setLogoUrl(publicUrl);
      toast.success("Logo enviado! Clique em Salvar para confirmar.");
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao enviar logo. Verifique se o bucket 'logos' existe no Supabase."));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Empresa</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as informações da sua empresa
        </p>
      </div>

      {/* Company Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações da Empresa
          </CardTitle>
          <CardDescription>
            Atualize os dados cadastrais da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo da empresa"
                  className="h-20 w-20 rounded-lg object-cover border"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Logotipo da Empresa</Label>
              <p className="text-xs text-muted-foreground">
                Aparecerá nos PDFs de contrato gerados. Máx. 2MB.
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={isUploadingLogo}
                >
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-3 w-3" />
                    {isUploadingLogo ? "Enviando..." : "Enviar Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                </Button>
                {logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoUrl(null)}
                    className="text-destructive"
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={cnpj}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O CNPJ não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Input
                  value={addressCep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="CEP"
                  maxLength={9}
                />
                {isLoadingCep && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="md:col-span-2">
                <Input
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="Rua / Logradouro"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Número"
              />
              <Input
                value={addressComplement}
                onChange={(e) => setAddressComplement(e.target.value)}
                placeholder="Complemento"
              />
              <Input
                value={addressNeighborhood}
                onChange={(e) => setAddressNeighborhood(e.target.value)}
                placeholder="Bairro"
              />
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <Input
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal Representative Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Representante Legal
          </CardTitle>
          <CardDescription>
            Dados do representante para assinatura dos contratos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="legalRepName">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="legalRepName"
                  value={legalRepName}
                  onChange={(e) => setLegalRepName(e.target.value)}
                  placeholder="Nome do representante legal"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalRepCpf">CPF</Label>
              <Input
                id="legalRepCpf"
                value={legalRepCpf}
                onChange={(e) => setLegalRepCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalRepRg">RG</Label>
              <Input
                id="legalRepRg"
                value={legalRepRg}
                onChange={(e) => setLegalRepRg(e.target.value)}
                placeholder="Número do RG"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalRepRgIssuer">Órgão Expedidor</Label>
              <Input
                id="legalRepRgIssuer"
                value={legalRepRgIssuer}
                onChange={(e) => setLegalRepRgIssuer(e.target.value)}
                placeholder="SSP/SP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalRepNationality">Nacionalidade</Label>
              <Input
                id="legalRepNationality"
                value={legalRepNationality}
                onChange={(e) => setLegalRepNationality(e.target.value)}
                placeholder="Brasileiro(a)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalRepProfession">Profissão</Label>
              <Input
                id="legalRepProfession"
                value={legalRepProfession}
                onChange={(e) => setLegalRepProfession(e.target.value)}
                placeholder="Empresário"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bank Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Dados Bancários
          </CardTitle>
          <CardDescription>
            Informações bancárias da empresa para pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bankName">Banco</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: Banco do Brasil, Itaú, Nubank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountType">Tipo de Conta</Label>
              <Select value={bankAccountType} onValueChange={setBankAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Conta Poupança</SelectItem>
                  <SelectItem value="pagamento">Conta Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAgency">Agência</Label>
              <Input
                id="bankAgency"
                value={bankAgency}
                onChange={(e) => setBankAgency(e.target.value)}
                placeholder="0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccount">Conta</Label>
              <Input
                id="bankAccount"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="00000-0"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contract Config Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Configurações de Contrato</CardTitle>
              <CardDescription>
                Valores padrão aplicados ao criar novos contratos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Padrão</Label>
              <Select value={defaultTemplateId} onValueChange={setDefaultTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum template padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {availableTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pré-selecionado ao criar contratos PJ</p>
            </div>
            <div className="space-y-2">
              <Label>Testemunhas Padrão</Label>
              <Select value={defaultWitnessCount} onValueChange={setDefaultWitnessCount}>
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
          </div>
          <div className="space-y-2">
            <Label>Política de Reajuste Padrão</Label>
            <Select value={defaultAdjustmentPolicy} onValueChange={setDefaultAdjustmentPolicy}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma política padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="IGPM">IGP-M (anual)</SelectItem>
                <SelectItem value="IPCA">IPCA (anual)</SelectItem>
                <SelectItem value="INPC">INPC (anual)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Índice de reajuste pré-selecionado em novos contratos</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Email Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MailOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>E-mail de Boas-vindas</CardTitle>
              <CardDescription>
                Personalize a mensagem enviada aos novos colaboradores convidados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modelo do E-mail</Label>
            <Textarea
              placeholder="Olá {nome},&#10;&#10;Seja bem-vindo(a) à {empresa}! Estamos felizes em tê-lo(a) em nossa equipe.&#10;&#10;Acesse o link abaixo para completar seu cadastro..."
              value={welcomeEmailTemplate}
              onChange={(e) => setWelcomeEmailTemplate(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded text-xs">{"nome"}</code> e <code className="bg-muted px-1 rounded text-xs">{"empresa"}</code> como variáveis no texto. Deixe em branco para usar o e-mail padrão do sistema.
            </p>
          </div>

          {welcomeEmailTemplate && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização:</p>
              <div className="text-sm whitespace-pre-wrap">
                {welcomeEmailTemplate
                  .replace(/\{nome\}/g, "João Silva")
                  .replace(/\{empresa\}/g, company?.name || "Sua Empresa")}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan & Limits Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <div>
              <CardTitle>Plano e Limites</CardTitle>
              <CardDescription>
                Acompanhe o uso e limites do seu plano atual
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Plano Atual</p>
              <p className="text-xl font-bold capitalize">{planName}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-2">Colaboradores</p>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-lg font-bold">{stats.colaboradores}</span>
                <span className="text-sm text-muted-foreground">de {maxCollaborators}</span>
              </div>
              <Progress value={maxCollaborators > 0 ? (stats.colaboradores / maxCollaborators) * 100 : 0} className="h-2" />
              {stats.colaboradores >= maxCollaborators && (
                <p className="text-xs text-destructive mt-1.5">Limite atingido — considere fazer upgrade</p>
              )}
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Vigência</p>
              <p className="text-lg font-bold">
                {planExpiresAt
                  ? new Date(planExpiresAt + "T12:00:00").toLocaleDateString("pt-BR")
                  : "Sem expiração"}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Precisa de mais recursos?</p>
              <p className="text-xs text-muted-foreground">Entre em contato para conhecer nossos planos</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Crown className="mr-1.5 h-3.5 w-3.5" />
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Conecte serviços externos para ampliar as funcionalidades
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "NFS-e", desc: "Emissão automática de notas fiscais de serviço", icon: "📄" },
              { name: "Pix", desc: "Pagamentos instantâneos via Pix para PJs", icon: "💸" },
              { name: "Blockchain", desc: "Registro imutável de assinaturas de contratos", icon: "🔗" },
            ].map((integration) => (
              <div key={integration.name} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{integration.icon}</span>
                    <p className="font-medium text-sm">{integration.name}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                    Em breve
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{integration.desc}</p>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Configurar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas da Empresa</CardTitle>
          <CardDescription>
            Visão geral dos dados da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-muted-foreground mr-1" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.colaboradores}</p>
              <p className="text-sm text-muted-foreground">Colaboradores</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-1">
                <FileText className="h-4 w-4 text-muted-foreground mr-1" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.contratosAtivos}</p>
              <p className="text-sm text-muted-foreground">Contratos Ativos</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-1">
                <CreditCard className="h-4 w-4 text-muted-foreground mr-1" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pagamentosMes}</p>
              <p className="text-sm text-muted-foreground">Pagamentos/Mês</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-foreground">
                {company?.is_active ? "Ativa" : "Inativa"}
              </p>
              <p className="text-sm text-muted-foreground">Status</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Empresa;
