import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft, Loader2, UserPlus, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getInviteByToken } from "@/services/inviteService";
import { validateCnpj } from "@/services/edgeFunctionService";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { formatCPF, formatPhone, formatCNPJ, validateCPF, validatePhone, validateCNPJ } from "@/lib/masks";
import { logger } from "@/lib/logger";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const step1Schema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
});

const step2Schema = z.object({
  companyName: z.string().min(2, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido"),
});

interface InviteData {
  id: string;
  email: string;
  company_id: string;
  role: string;
  status: string;
  expires_at: string;
}

interface CNPJValidationResult {
  valid: boolean;
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao?: string;
  uf?: string;
  municipio?: string;
  error?: string;
}

const Registro = () => {
  useDocumentTitle("Registro");
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token") || searchParams.get("convite");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(!!inviteToken);
  const [isValidatingCNPJ, setIsValidatingCNPJ] = useState(false);
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJValidationResult | null>(null);
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  // Form data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  
  const [errors, setErrors] = useState({
    cpf: "",
    phone: "",
    cnpj: "",
  });

  const { signUp, signUpWithInvite } = useAuth();
  const navigate = useNavigate();

  // Fetch invite data if token is present
  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteToken) return;

      try {
        const data = await getInviteByToken(inviteToken);

        if (!data || data.length === 0) {
          setInviteError("Convite inválido ou expirado");
          setIsLoadingInvite(false);
          return;
        }

        const invite = data[0] as InviteData;
        setInviteData(invite);
        setEmail(invite.email);
      } catch (error) {
        logger.error("Error fetching invite:", error);
        setInviteError("Erro ao carregar convite");
      } finally {
        setIsLoadingInvite(false);
      }
    };

    fetchInvite();
  }, [inviteToken]);

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
    if (formatted.length === 14) {
      setErrors(prev => ({ ...prev, cpf: validateCPF(formatted) ? "" : "CPF inválido" }));
    } else {
      setErrors(prev => ({ ...prev, cpf: "" }));
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setPhone(formatted);
    if (formatted.length >= 14) {
      setErrors(prev => ({ ...prev, phone: validatePhone(formatted) ? "" : "Telefone inválido" }));
    } else {
      setErrors(prev => ({ ...prev, phone: "" }));
    }
  };

  const validateCNPJFromAPI = async (cnpjValue: string) => {
    const cleanCNPJ = cnpjValue.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;

    setIsValidatingCNPJ(true);
    setCnpjValidated(false);
    setCnpjData(null);

    try {
      const data = await validateCnpj(cleanCNPJ);

      setCnpjData(data);
      
      if (data.valid) {
        setCnpjValidated(true);
        setErrors(prev => ({ ...prev, cnpj: "" }));
        // Auto-fill company name if empty
        if (!companyName && (data.nome_fantasia || data.razao_social)) {
          setCompanyName(data.nome_fantasia || data.razao_social);
        }
        toast.success("CNPJ válido! Dados da empresa carregados.");
      } else {
        setErrors(prev => ({ ...prev, cnpj: data.error || "CNPJ não encontrado na Receita Federal" }));
      }
    } catch (error) {
      logger.error("Error validating CNPJ:", error);
      // A validação local já passou — permite prosseguir mesmo sem acesso à API
      setCnpjValidated(true);
      setErrors(prev => ({ ...prev, cnpj: "" }));
      toast.warning("Não foi possível verificar o CNPJ na Receita Federal. Prossiga com atenção.");
    } finally {
      setIsValidatingCNPJ(false);
    }
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setCnpj(formatted);
    setCnpjValidated(false);
    setCnpjData(null);
    
    if (formatted.length === 18) {
      if (!validateCNPJ(formatted)) {
        setErrors(prev => ({ ...prev, cnpj: "CNPJ inválido (dígitos verificadores incorretos)" }));
      } else {
        setErrors(prev => ({ ...prev, cnpj: "" }));
        // Auto-validate via API when CNPJ is complete and valid algorithmically
        validateCNPJFromAPI(formatted);
      }
    } else {
      setErrors(prev => ({ ...prev, cnpj: "" }));
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      financeiro: "Financeiro",
      gestor: "Gestor",
      colaborador: "Colaborador",
    };
    return labels[role] || role;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For invited users, only personal data is needed (no company step)
    if (inviteData) {
      const validation = step1Schema.safeParse({
        fullName,
        email,
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        password,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      if (!acceptedTerms || !acceptedPrivacy) {
        toast.error("Você precisa aceitar os termos para continuar");
        return;
      }

      setIsLoading(true);

      const { error } = await signUpWithInvite({
        email,
        password,
        fullName,
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        inviteToken: inviteToken!,
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("Este e-mail já está cadastrado");
        } else if (error.message.includes("Invalid or expired invite")) {
          toast.error("Convite inválido ou expirado");
        } else {
          toast.error("Erro ao criar conta. Tente novamente.");
        }
      } else {
        toast.success("Conta criada com sucesso!");
        navigate("/dashboard");
      }

      setIsLoading(false);
      return;
    }

    // Regular signup flow (with company)
    if (step === 1) {
      const validation = step1Schema.safeParse({
        fullName,
        email,
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        password,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setStep(2);
    } else {
      const validation = step2Schema.safeParse({
        companyName,
        cnpj: cnpj.replace(/\D/g, ""),
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      if (!acceptedTerms || !acceptedPrivacy) {
        toast.error("Você precisa aceitar os termos para continuar");
        return;
      }

      setIsLoading(true);

      const { error } = await signUp({
        email,
        password,
        fullName,
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        companyName,
        cnpj: cnpj.replace(/\D/g, ""),
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("Este e-mail já está cadastrado");
        } else {
          toast.error("Erro ao criar conta. Tente novamente.");
        }
      } else {
        toast.success("Conta criada com sucesso!");
        navigate("/dashboard");
      }

      setIsLoading(false);
    }
  };

  // Show loading state while fetching invite
  if (isLoadingInvite) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando convite...</p>
        </div>
      </div>
    );
  }

  // Show error state for invalid invite
  if (inviteToken && inviteError) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Convite Inválido</h1>
          <p className="text-muted-foreground mb-6">{inviteError}</p>
          <Link to="/">
            <Button variant="outline">Voltar para o início</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
        </div>

        <div className="relative text-center max-w-lg">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            {inviteData
              ? "Você foi convidado!"
              : "Comece a gerenciar sua empresa hoje"}
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            {inviteData
              ? `Complete seu cadastro para fazer parte da equipe como ${getRoleLabel(inviteData.role)}.`
              : "Crie sua conta em minutos e tenha acesso a todos os recursos do Aure."}
          </p>
          
          {/* Steps Preview - only for regular signup */}
          {!inviteData && (
            <div className="flex items-center justify-center gap-4">
              <StepIndicator number={1} label="Dados Pessoais" active={step === 1} completed={step > 1} />
              <div className="w-12 h-0.5 bg-primary-foreground/30" />
              <StepIndicator number={2} label="Empresa" active={step === 2} completed={step > 2} />
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Back Link */}
          <button
            onClick={() => (step > 1 && !inviteData ? setStep(step - 1) : null)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            {step > 1 && !inviteData ? "Voltar" : <Link to="/">Voltar para o início</Link>}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <span className="font-bold text-2xl text-foreground">Aure</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {inviteData
                ? "Complete seu cadastro"
                : step === 1
                ? "Criar sua conta"
                : "Dados da empresa"}
            </h1>
            <p className="text-muted-foreground">
              {inviteData
                ? "Preencha seus dados pessoais para aceitar o convite"
                : step === 1
                ? "Preencha seus dados pessoais para começar"
                : "Informe os dados da sua empresa"}
            </p>
            {inviteData && (
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">{getRoleLabel(inviteData.role)}</Badge>
                <span className="text-sm text-muted-foreground">
                  Você será adicionado como {getRoleLabel(inviteData.role).toLowerCase()}
                </span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {(step === 1 || inviteData) ? (
              <>
                {/* Step 1: Personal Data */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!!inviteData}
                    className="h-12"
                  />
                  {inviteData && (
                    <p className="text-xs text-muted-foreground">
                      E-mail definido pelo convite
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    required
                    maxLength={14}
                    className={`h-12 ${errors.cpf ? "border-destructive" : ""}`}
                  />
                  {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                    maxLength={15}
                    className={`h-12 ${errors.phone ? "border-destructive" : ""}`}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mín. 8 caracteres com maiúscula, minúscula, número e especial
                  </p>
                </div>

                {/* Terms for invited users */}
                {inviteData && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                        Li e aceito os{" "}
                        <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Termos de Uso
                        </a>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="privacy"
                        checked={acceptedPrivacy}
                        onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                      />
                      <label htmlFor="privacy" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                        Li e aceito a{" "}
                        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Política de Privacidade
                        </a>
                      </label>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Step 2: Company Data */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da empresa</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Nome da sua empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <div className="relative">
                    <Input
                      id="cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => handleCNPJChange(e.target.value)}
                      required
                      maxLength={18}
                      className={`h-12 pr-12 ${
                        errors.cnpj 
                          ? "border-destructive" 
                          : cnpjValidated 
                            ? "border-green-500" 
                            : ""
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isValidatingCNPJ && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {!isValidatingCNPJ && cnpjValidated && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {!isValidatingCNPJ && errors.cnpj && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                  {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
                  
                  {/* Show validated company info */}
                  {cnpjValidated && cnpjData && (
                    <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-green-800 dark:text-green-200">
                            Empresa verificada na Receita Federal
                          </p>
                          <p className="text-green-700 dark:text-green-300">
                            <span className="font-medium">Razão Social:</span> {cnpjData.razao_social}
                          </p>
                          {cnpjData.nome_fantasia && cnpjData.nome_fantasia !== cnpjData.razao_social && (
                            <p className="text-green-700 dark:text-green-300">
                              <span className="font-medium">Nome Fantasia:</span> {cnpjData.nome_fantasia}
                            </p>
                          )}
                          {cnpjData.situacao && (
                            <p className="text-green-700 dark:text-green-300">
                              <span className="font-medium">Situação:</span> {cnpjData.situacao}
                            </p>
                          )}
                          {cnpjData.municipio && cnpjData.uf && (
                            <p className="text-green-700 dark:text-green-300">
                              <span className="font-medium">Localização:</span> {cnpjData.municipio}/{cnpjData.uf}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                      Li e aceito os{" "}
                      <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Termos de Uso
                      </a>
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="privacy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                    />
                    <label htmlFor="privacy" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                      Li e aceito a{" "}
                      <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Política de Privacidade
                      </a>
                    </label>
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                isLoading ||
                isValidatingCNPJ ||
                (inviteData && (!acceptedTerms || !acceptedPrivacy)) ||
                (!inviteData && step === 2 && (!acceptedTerms || !acceptedPrivacy || !cnpjValidated))
              }
            >
              {isLoading
                ? "Criando conta..."
                : inviteData
                ? "Aceitar convite e criar conta"
                : step === 1
                ? "Continuar"
                : "Criar minha conta"}
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
          active
            ? "bg-primary-foreground text-primary"
            : completed
            ? "bg-primary-foreground/80 text-primary"
            : "bg-primary-foreground/20 text-primary-foreground/60"
        }`}
      >
        {completed ? "✓" : number}
      </div>
      <span
        className={`text-sm ${
          active ? "text-primary-foreground" : "text-primary-foreground/60"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default Registro;
