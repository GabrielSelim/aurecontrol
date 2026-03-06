import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPJProfile, savePJOnboarding, PJOnboardingData } from "@/services/pjService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, User, Building2, MapPin, CreditCard } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, formatPhone, formatCNPJ } from "@/lib/masks";
import { logger } from "@/lib/logger";

const formatCEP = (v: string) =>
  v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);

const PJPerfil = () => {
  useDocumentTitle("Meu Perfil — Aure");
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<Partial<PJOnboardingData>>({});

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const data = await fetchPJProfile(user!.id);
      if (data) setForm(data as any);
    } catch (err) {
      logger.error("PJPerfil load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await savePJOnboarding(user!.id, form as PJOnboardingData);
      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (err) {
      logger.error("PJPerfil save error:", err);
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const set = (key: keyof PJOnboardingData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações cadastrais</p>
      </div>

      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" /> Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nome Completo</Label>
            <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label>CPF</Label>
            <Input
              value={form.cpf ?? ""}
              onChange={(e) => set("cpf", formatCPF(e.target.value))}
              maxLength={14}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => set("phone", formatPhone(e.target.value))}
              maxLength={15}
            />
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input
              type="date"
              value={form.birth_date ?? ""}
              onChange={(e) => set("birth_date", e.target.value)}
            />
          </div>
          <div>
            <Label>Nacionalidade</Label>
            <Input value={form.nationality ?? ""} onChange={(e) => set("nationality", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" /> Dados da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>CNPJ</Label>
            <Input
              value={form.pj_cnpj ?? ""}
              onChange={(e) => set("pj_cnpj", formatCNPJ(e.target.value))}
              maxLength={18}
            />
          </div>
          <div>
            <Label>Razão Social</Label>
            <Input value={form.pj_razao_social ?? ""} onChange={(e) => set("pj_razao_social", e.target.value)} />
          </div>
          <div>
            <Label>Nome Fantasia</Label>
            <Input value={form.pj_nome_fantasia ?? ""} onChange={(e) => set("pj_nome_fantasia", e.target.value)} />
          </div>
          <div>
            <Label>Regime Tributário</Label>
            <Select value={form.pj_regime_tributario ?? ""} onValueChange={(v) => set("pj_regime_tributario", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                <SelectItem value="lucro_real">Lucro Real</SelectItem>
                <SelectItem value="mei">MEI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" /> Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>CEP</Label>
            <Input
              value={form.address_cep ?? ""}
              onChange={(e) => set("address_cep", formatCEP(e.target.value))}
              maxLength={9}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Logradouro</Label>
            <Input value={form.address_street ?? ""} onChange={(e) => set("address_street", e.target.value)} />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={form.address_number ?? ""} onChange={(e) => set("address_number", e.target.value)} />
          </div>
          <div>
            <Label>Complemento</Label>
            <Input value={form.address_complement ?? ""} onChange={(e) => set("address_complement", e.target.value)} />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={form.address_neighborhood ?? ""} onChange={(e) => set("address_neighborhood", e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.address_city ?? ""} onChange={(e) => set("address_city", e.target.value)} />
          </div>
          <div>
            <Label>Estado (UF)</Label>
            <Input value={form.address_state ?? ""} onChange={(e) => set("address_state", e.target.value)} maxLength={2} />
          </div>
        </CardContent>
      </Card>

      {/* Dados Bancários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" /> Dados Bancários
          </CardTitle>
          <CardDescription>Para recebimento de pagamentos</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Banco</Label>
            <Input value={form.pj_bank_name ?? ""} onChange={(e) => set("pj_bank_name", e.target.value)} />
          </div>
          <div>
            <Label>Tipo de Conta</Label>
            <Select value={form.pj_bank_account_type ?? ""} onValueChange={(v) => set("pj_bank_account_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Conta Corrente</SelectItem>
                <SelectItem value="poupanca">Conta Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Agência</Label>
            <Input value={form.pj_bank_agency ?? ""} onChange={(e) => set("pj_bank_agency", e.target.value)} />
          </div>
          <div>
            <Label>Conta</Label>
            <Input value={form.pj_bank_account ?? ""} onChange={(e) => set("pj_bank_account", e.target.value)} />
          </div>

          <Separator className="sm:col-span-2" />

          <div>
            <Label>Chave Pix</Label>
            <Input value={form.pj_pix_key ?? ""} onChange={(e) => set("pj_pix_key", e.target.value)} />
          </div>
          <div>
            <Label>Tipo de Chave Pix</Label>
            <Select value={form.pj_pix_key_type ?? ""} onValueChange={(v) => set("pj_pix_key_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default PJPerfil;
