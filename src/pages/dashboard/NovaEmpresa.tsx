import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCompany } from "@/services/companyService";
import { validateCnpj } from "@/services/edgeFunctionService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCNPJ as formatCNPJMask, validateCNPJ } from "@/lib/masks";
import { logger } from "@/lib/logger";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface CNPJValidationResult {
  valid: boolean;
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao?: string;
  uf?: string;
  municipio?: string;
  error?: string;
  already_registered?: boolean;
  existing_company_name?: string;
}

export default function NovaEmpresa() {
  useDocumentTitle("Nova Empresa");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingCNPJ, setIsValidatingCNPJ] = useState(false);
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJValidationResult | null>(null);
  const [cnpjError, setCnpjError] = useState("");

  const validateCNPJFromAPI = async (cnpjValue: string) => {
    const cleanCNPJ = cnpjValue.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;

    setIsValidatingCNPJ(true);
    setCnpjValidated(false);
    setCnpjData(null);

    try {
      const result = await validateCnpj(cleanCNPJ);
      setCnpjData(result);

      if (result.already_registered) {
        setCnpjError(`CNPJ já cadastrado para a empresa "${result.existing_company_name}"`);
        return;
      }

      if (result.valid) {
        setCnpjValidated(true);
        setCnpjError("");
        toast.success("CNPJ válido!");

        // Auto-fill name from CNPJ data if empty
        if (!form.name && (result.nome_fantasia || result.razao_social)) {
          setForm((prev) => ({
            ...prev,
            name: result.nome_fantasia || result.razao_social || "",
          }));
        }
      } else {
        setCnpjError(result.error || "CNPJ inválido");
      }
    } catch (error) {
      logger.error("Error validating CNPJ:", error);
      // A validação local já passou — permite prosseguir mesmo sem acesso à API
      setCnpjValidated(true);
      setCnpjError("");
      toast.warning("Não foi possível verificar o CNPJ na Receita Federal.");
    } finally {
      setIsValidatingCNPJ(false);
    }
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJMask(value);
    setForm({ ...form, cnpj: formatted });
    setCnpjValidated(false);
    setCnpjData(null);

    if (formatted.length === 18) {
      if (!validateCNPJ(formatted)) {
        setCnpjError("CNPJ inválido (dígitos verificadores incorretos)");
      } else {
        setCnpjError("");
        validateCNPJFromAPI(formatted);
      }
    } else {
      setCnpjError("");
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    if (form.name.trim().length > 200) {
      toast.error("Nome da empresa deve ter no máximo 200 caracteres");
      return;
    }

    const cleanCNPJ = form.cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) {
      toast.error("CNPJ é obrigatório e deve ter 14 dígitos");
      return;
    }

    if (!cnpjValidated) {
      toast.error("Aguarde a validação do CNPJ");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("E-mail inválido");
      return;
    }

    setIsSaving(true);
    try {
      const newCompany = await createCompany({
        name: form.name.trim(),
        cnpj: cleanCNPJ,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });

      toast.success("Empresa criada com sucesso!");
      navigate(`/dashboard/empresas/${newCompany.id}`);
    } catch (error) {
      logger.error("Error creating company:", error);
      toast.error("Erro ao criar empresa. Verifique os dados e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/empresas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Nova Empresa
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre uma nova empresa no sistema
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para cadastrar uma nova empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className="flex-1"
              />
              {isValidatingCNPJ && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
              {cnpjValidated && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {cnpjError && (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
            {cnpjError && (
              <p className="text-sm text-destructive">{cnpjError}</p>
            )}
            {cnpjData?.valid && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                {cnpjData.razao_social && (
                  <p><span className="font-medium">Razão Social:</span> {cnpjData.razao_social}</p>
                )}
                {cnpjData.nome_fantasia && (
                  <p><span className="font-medium">Nome Fantasia:</span> {cnpjData.nome_fantasia}</p>
                )}
                {cnpjData.situacao && (
                  <p><span className="font-medium">Situação:</span> {cnpjData.situacao}</p>
                )}
                {cnpjData.municipio && cnpjData.uf && (
                  <p><span className="font-medium">Localização:</span> {cnpjData.municipio}/{cnpjData.uf}</p>
                )}
              </div>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Empresa *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome da empresa"
              maxLength={200}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contato@empresa.com"
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Endereço completo"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/empresas")}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !form.name.trim() || !cnpjValidated}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Criar Empresa
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
