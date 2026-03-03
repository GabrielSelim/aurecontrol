import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { savePJOnboarding } from "@/services/pjService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Building2, User, MapPin, Banknote, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCPF, formatPhone, formatCNPJ } from "@/lib/masks";

const formatCEP = (v: string) =>
  v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { logger } from "@/lib/logger";

const STEPS = [
  { id: 1, title: "Dados Pessoais", icon: User, description: "Suas informações pessoais" },
  { id: 2, title: "Empresa", icon: Building2, description: "Dados da sua empresa" },
  { id: 3, title: "Endereço", icon: MapPin, description: "Endereço comercial" },
  { id: 4, title: "Dados Bancários", icon: Banknote, description: "Para receber pagamentos" },
];

const BemVindo = () => {
  useDocumentTitle("Bem-vindo ao Aure");
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Step 1 — Dados pessoais
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [cpf, setCpf] = useState(profile?.cpf || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("Brasileiro(a)");

  // Step 2 — Empresa
  const [cnpj, setCnpj] = useState(profile?.pj_cnpj || "");
  const [razaoSocial, setRazaoSocial] = useState(profile?.pj_razao_social || "");
  const [nomeFantasia, setNomeFantasia] = useState(profile?.pj_nome_fantasia || "");
  const [regimeTributario, setRegimeTributario] = useState("simples_nacional");

  // Step 3 — Endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Step 4 — Bancário
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountType, setBankAccountType] = useState("corrente");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!fullName.trim() || fullName.trim().length < 3) errs.fullName = "Nome deve ter ao menos 3 caracteres";
      if (!cpf.trim() || cpf.replace(/\D/g, "").length !== 11) errs.cpf = "CPF inválido";
      if (!phone.trim() || phone.replace(/\D/g, "").length < 10) errs.phone = "Telefone inválido";
    }
    if (s === 2) {
      if (!cnpj.trim() || cnpj.replace(/\D/g, "").length !== 14) errs.cnpj = "CNPJ inválido";
      if (!razaoSocial.trim() || razaoSocial.trim().length < 3) errs.razaoSocial = "Razão Social é obrigatória";
      if (!regimeTributario) errs.regimeTributario = "Selecione o regime tributário";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleCepBlur = async () => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } catch { /* silent */ } finally {
      setIsSearchingCep(false);
    }
  };

  const handleFinish = async () => {
    if (!validateStep(4)) return;
    if (!user) return;

    setIsLoading(true);
    try {
      await savePJOnboarding(user.id, {
        full_name: fullName.trim(),
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        birth_date: birthDate || undefined,
        nationality,
        pj_cnpj: cnpj.replace(/\D/g, ""),
        pj_razao_social: razaoSocial.trim(),
        pj_nome_fantasia: nomeFantasia.trim() || undefined,
        pj_regime_tributario: regimeTributario,
        address_cep: cep.replace(/\D/g, "") || undefined,
        address_street: street || undefined,
        address_number: number || undefined,
        address_complement: complement || undefined,
        address_neighborhood: neighborhood || undefined,
        address_city: city || undefined,
        address_state: state || undefined,
        pj_bank_name: bankName || undefined,
        pj_bank_agency: bankAgency || undefined,
        pj_bank_account: bankAccount || undefined,
        pj_bank_account_type: bankAccountType,
        pj_pix_key: pixKey || undefined,
        pj_pix_key_type: pixKeyType,
      });

      toast.success("Cadastro concluído! Bem-vindo ao Aure.");
      navigate("/pj/dashboard");
    } catch (error) {
      logger.error("Onboarding PJ error:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentStep = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-2xl">Aure</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Bem-vindo ao Aure!</h1>
          <p className="text-muted-foreground mt-1">Complete seu cadastro para acessar a plataforma</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8 px-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isComplete = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    isComplete ? "bg-primary border-primary text-primary-foreground" :
                    isCurrent  ? "border-primary text-primary" :
                    "border-muted text-muted-foreground"
                  )}>
                    {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 font-medium text-center hidden sm:block",
                    isCurrent ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-2 transition-all",
                    step > s.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <currentStep.icon className="h-5 w-5 text-primary" />
              {currentStep.title}
            </CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1 — Dados Pessoais */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input id="cpf" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
                    {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de nascimento</Label>
                    <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nacionalidade</Label>
                    <Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Brasileiro(a)" />
                  </div>
                </div>
              </>
            )}

            {/* Step 2 — Empresa */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} placeholder="00.000.000/0001-00" maxLength={18} />
                  {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial">Razão Social *</Label>
                  <Input id="razaoSocial" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Nome jurídico da empresa" />
                  {errors.razaoSocial && <p className="text-sm text-destructive">{errors.razaoSocial}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input id="nomeFantasia" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} placeholder="Nome comercial (opcional)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regime">Regime Tributário *</Label>
                  <Select value={regimeTributario} onValueChange={setRegimeTributario}>
                    <SelectTrigger id="regime">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mei">MEI — Microempreendedor Individual</SelectItem>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.regimeTributario && <p className="text-sm text-destructive">{errors.regimeTributario}</p>}
                </div>
              </>
            )}

            {/* Step 3 — Endereço */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="relative">
                    <Input
                      id="cep"
                      value={cep}
                      onChange={(e) => setCep(formatCEP ? formatCEP(e.target.value) : e.target.value)}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {isSearchingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="street">Logradouro</Label>
                    <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua, Av., etc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input id="complement" value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Sala, andar..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">UF</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">O endereço é opcional mas facilita a emissão de NFS-e.</p>
              </>
            )}

            {/* Step 4 — Dados Bancários */}
            {step === 4 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Banco</Label>
                  <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex: Bradesco, Itaú, Nubank..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAgency">Agência</Label>
                    <Input id="bankAgency" value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} placeholder="0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Conta</Label>
                    <Input id="bankAccount" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="00000-0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountType">Tipo de conta</Label>
                  <Select value={bankAccountType} onValueChange={setBankAccountType}>
                    <SelectTrigger id="bankAccountType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Conta Poupança</SelectItem>
                      <SelectItem value="pagamento">Conta de Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium">Chave Pix</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pixKeyType">Tipo</Label>
                      <Select value={pixKeyType} onValueChange={setPixKeyType}>
                        <SelectTrigger id="pixKeyType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pixKey">Chave</Label>
                      <Input id="pixKey" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave Pix" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Os dados bancários são usados para processar seus pagamentos via Pix ou transferência.</p>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>

              {step < 4 ? (
                <Button onClick={handleNext}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 mr-2" />Concluir cadastro</>
                  )}
                </Button>
              )}
            </div>

            {step === 3 && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setStep(4)}>
                Pular endereço por agora
              </Button>
            )}
            {step === 4 && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { navigate("/pj/dashboard"); }}>
                Pular por agora e preencher depois
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BemVindo;
