import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProfile, updateProfileById } from "@/services/profileService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCPF, formatPhone, formatCNPJ, validateCPF, validatePhone, validateCNPJ } from "@/lib/masks";
import { AddressForm } from "@/components/AddressForm";
import { AddressData } from "@/hooks/useCepLookup";
import { logger } from "@/lib/logger";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface ColaboradorData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  cpf: string;
  phone: string;
  is_active: boolean;
  pj_cnpj: string;
  pj_razao_social: string;
  pj_nome_fantasia: string;
}

const ColaboradorEditar = () => {
  const { id } = useParams<{ id: string }>();
  useDocumentTitle("Editar Colaborador");
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ColaboradorData>({
    id: "",
    user_id: "",
    full_name: "",
    email: "",
    cpf: "",
    phone: "",
    is_active: true,
    pj_cnpj: "",
    pj_razao_social: "",
    pj_nome_fantasia: "",
  });
  const [addressData, setAddressData] = useState<AddressData>({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [errors, setErrors] = useState<{ cpf?: string; phone?: string; pj_cnpj?: string }>({});

  useEffect(() => {
    const fetchColaborador = async () => {
      if (!id || !profile?.company_id) return;

      try {
        const data = await fetchProfile(id, profile.company_id);

        if (data) {
          setFormData({
            id: data.id,
            user_id: data.user_id,
            full_name: data.full_name,
            email: data.email,
            cpf: data.cpf ? formatCPF(data.cpf) : "",
            phone: data.phone ? formatPhone(data.phone) : "",
            is_active: data.is_active ?? true,
            pj_cnpj: data.pj_cnpj ? formatCNPJ(data.pj_cnpj) : "",
            pj_razao_social: data.pj_razao_social || "",
            pj_nome_fantasia: data.pj_nome_fantasia || "",
          });
          setAddressData({
            cep: data.address_cep || "",
            street: data.address_street || "",
            number: data.address_number || "",
            complement: data.address_complement || "",
            neighborhood: data.address_neighborhood || "",
            city: data.address_city || "",
            state: data.address_state || "",
          });
        }
      } catch (error) {
        logger.error("Error fetching colaborador:", error);
        toast.error("Erro ao carregar dados do colaborador");
        navigate("/dashboard/colaboradores");
      } finally {
        setIsLoading(false);
      }
    };

    fetchColaborador();
  }, [id, profile?.company_id, navigate]);

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, cpf: formatted });
    
    if (formatted.length === 14) {
      if (!validateCPF(formatted)) {
        setErrors({ ...errors, cpf: "CPF inválido" });
      } else {
        setErrors({ ...errors, cpf: undefined });
      }
    } else {
      setErrors({ ...errors, cpf: undefined });
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData({ ...formData, phone: formatted });
    
    if (formatted.length >= 14) {
      if (!validatePhone(formatted)) {
        setErrors({ ...errors, phone: "Telefone inválido" });
      } else {
        setErrors({ ...errors, phone: undefined });
      }
    } else {
      setErrors({ ...errors, phone: undefined });
    }
  };

  const handlePJCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setFormData({ ...formData, pj_cnpj: formatted });
    
    if (formatted.length === 18) {
      if (!validateCNPJ(formatted)) {
        setErrors({ ...errors, pj_cnpj: "CNPJ inválido" });
      } else {
        setErrors({ ...errors, pj_cnpj: undefined });
      }
    } else {
      setErrors({ ...errors, pj_cnpj: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: { cpf?: string; phone?: string; pj_cnpj?: string } = {};
    
    if (formData.cpf && !validateCPF(formData.cpf)) {
      newErrors.cpf = "CPF inválido";
    }
    
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Telefone inválido";
    }

    if (formData.pj_cnpj && formData.pj_cnpj.length === 18 && !validateCNPJ(formData.pj_cnpj)) {
      newErrors.pj_cnpj = "CNPJ inválido";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Corrija os erros antes de salvar");
      return;
    }

    setIsSaving(true);

    try {
      await updateProfileById(formData.id, {
          full_name: formData.full_name,
          cpf: formData.cpf.replace(/\D/g, "") || null,
          phone: formData.phone.replace(/\D/g, "") || null,
          is_active: formData.is_active,
          pj_cnpj: formData.pj_cnpj.replace(/\D/g, "") || null,
          pj_razao_social: formData.pj_razao_social || null,
          pj_nome_fantasia: formData.pj_nome_fantasia || null,
          address_cep: addressData.cep.replace(/\D/g, "") || null,
          address_street: addressData.street || null,
          address_number: addressData.number || null,
          address_complement: addressData.complement || null,
          address_neighborhood: addressData.neighborhood || null,
          address_city: addressData.city || null,
          address_state: addressData.state || null,
      });

      toast.success("Colaborador atualizado com sucesso!");
      navigate("/dashboard/colaboradores");
    } catch (error) {
      logger.error("Error updating colaborador:", error);
      toast.error("Erro ao atualizar colaborador");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso não autorizado</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/colaboradores")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Colaborador</h1>
          <p className="text-muted-foreground mt-1">
            Atualize as informações do colaborador
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>Informações pessoais do colaborador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {errors.cpf && (
                  <p className="text-xs text-destructive">{errors.cpf}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Digite o CEP para preencher automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <AddressForm
              address={addressData}
              onChange={setAddressData}
            />
          </CardContent>
        </Card>

        {/* Dados PJ */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Pessoa Jurídica</CardTitle>
            <CardDescription>Preencha se o colaborador presta serviços como PJ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pj_cnpj">CNPJ</Label>
                <Input
                  id="pj_cnpj"
                  value={formData.pj_cnpj}
                  onChange={(e) => handlePJCNPJChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {errors.pj_cnpj && (
                  <p className="text-xs text-destructive">{errors.pj_cnpj}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pj_razao_social">Razão Social</Label>
                <Input
                  id="pj_razao_social"
                  value={formData.pj_razao_social}
                  onChange={(e) => setFormData({ ...formData, pj_razao_social: e.target.value })}
                  placeholder="Nome oficial da empresa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pj_nome_fantasia">Nome Fantasia</Label>
              <Input
                id="pj_nome_fantasia"
                value={formData.pj_nome_fantasia}
                onChange={(e) => setFormData({ ...formData, pj_nome_fantasia: e.target.value })}
                placeholder="Nome comercial (opcional)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Configurações de acesso do colaborador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Colaborador Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Colaboradores inativos não podem acessar o sistema
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/dashboard/colaboradores")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ColaboradorEditar;
