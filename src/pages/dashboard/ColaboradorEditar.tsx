import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCPF, formatPhone, validateCPF, validatePhone } from "@/lib/masks";

interface ColaboradorData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  cpf: string;
  phone: string;
  is_active: boolean;
}

const ColaboradorEditar = () => {
  const { id } = useParams<{ id: string }>();
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
  });
  const [errors, setErrors] = useState<{ cpf?: string; phone?: string }>({});

  useEffect(() => {
    const fetchColaborador = async () => {
      if (!id || !profile?.company_id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .eq("company_id", profile.company_id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            id: data.id,
            user_id: data.user_id,
            full_name: data.full_name,
            email: data.email,
            cpf: data.cpf ? formatCPF(data.cpf) : "",
            phone: data.phone ? formatPhone(data.phone) : "",
            is_active: data.is_active ?? true,
          });
        }
      } catch (error) {
        console.error("Error fetching colaborador:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: { cpf?: string; phone?: string } = {};
    
    if (formData.cpf && !validateCPF(formData.cpf)) {
      newErrors.cpf = "CPF inválido";
    }
    
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Telefone inválido";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Corrija os erros antes de salvar");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          cpf: formData.cpf.replace(/\D/g, "") || null,
          phone: formData.phone.replace(/\D/g, "") || null,
          is_active: formData.is_active,
        })
        .eq("id", formData.id);

      if (error) throw error;

      toast.success("Colaborador atualizado com sucesso!");
      navigate("/dashboard/colaboradores");
    } catch (error) {
      console.error("Error updating colaborador:", error);
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
