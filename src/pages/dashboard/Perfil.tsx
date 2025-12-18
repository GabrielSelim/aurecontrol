import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Building2, Lock, Camera, Loader2, Save, Briefcase, MapPin } from "lucide-react";
import { formatCPF, formatPhone, formatCNPJ, validateCPF, validatePhone, validateCNPJ } from "@/lib/masks";
import { AddressForm } from "@/components/AddressForm";
import { AddressData } from "@/hooks/useCepLookup";

interface ProfileData {
  full_name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  avatar_url: string | null;
  pj_cnpj: string | null;
  pj_razao_social: string | null;
  pj_nome_fantasia: string | null;
  // Representative data
  nationality: string | null;
  marital_status: string | null;
  birth_date: string | null;
  profession: string | null;
  identity_number: string | null;
  identity_issuer: string | null;
}

interface CompanyData {
  name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export default function Perfil() {
  const { user, profile, roles, hasRole } = useAuth();
  
  // Check if user can edit restricted fields (profession, etc.)
  const canEditRestrictedFields = hasRole('admin') || hasRole('gestor') || hasRole('master_admin');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPJ, setIsSavingPJ] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: "",
    email: "",
    cpf: null,
    phone: null,
    avatar_url: null,
    pj_cnpj: null,
    pj_razao_social: null,
    pj_nome_fantasia: null,
    nationality: null,
    marital_status: null,
    birth_date: null,
    profession: null,
    identity_number: null,
    identity_issuer: null,
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

  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    cpf: "",
    phone: "",
    pj_cnpj: "",
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name,
        email: profile.email,
        cpf: profile.cpf ? formatCPF(profile.cpf) : null,
        phone: profile.phone ? formatPhone(profile.phone) : null,
        avatar_url: profile.avatar_url,
        pj_cnpj: profile.pj_cnpj ? formatCNPJ(profile.pj_cnpj) : null,
        pj_razao_social: profile.pj_razao_social,
        pj_nome_fantasia: profile.pj_nome_fantasia,
        nationality: (profile as any).nationality || null,
        marital_status: (profile as any).marital_status || null,
        birth_date: (profile as any).birth_date || null,
        profession: (profile as any).profession || null,
        identity_number: (profile as any).identity_number || null,
        identity_issuer: (profile as any).identity_issuer || null,
      });
      setAddressData({
        cep: profile.address_cep || "",
        street: profile.address_street || "",
        number: profile.address_number || "",
        complement: profile.address_complement || "",
        neighborhood: profile.address_neighborhood || "",
        city: profile.address_city || "",
        state: profile.address_state || "",
      });
      fetchCompany();
    }
  }, [profile]);

  const fetchCompany = async () => {
    if (!profile?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("name, cnpj, email, phone, address")
        .eq("id", profile.company_id)
        .single();
      
      if (error) throw error;
      setCompanyData(data);
    } catch (error) {
      console.error("Error fetching company:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      master_admin: "Master Admin",
      admin: "Administrador",
      financeiro: "Financeiro",
      juridico: "Jurídico",
      gestor: "Gestor",
      colaborador: "Colaborador",
    };
    return labels[role] || role;
  };

  const handlePJCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setProfileData((prev) => ({ ...prev, pj_cnpj: formatted }));
    
    if (formatted.length === 18) {
      if (!validateCNPJ(formatted)) {
        setErrors((prev) => ({ ...prev, pj_cnpj: "CNPJ inválido" }));
      } else {
        setErrors((prev) => ({ ...prev, pj_cnpj: "" }));
      }
    } else {
      setErrors((prev) => ({ ...prev, pj_cnpj: "" }));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfileData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Foto atualizada com sucesso!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao atualizar foto");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setProfileData((prev) => ({ ...prev, cpf: formatted }));
    
    if (formatted.length === 14) {
      if (!validateCPF(formatted)) {
        setErrors((prev) => ({ ...prev, cpf: "CPF inválido" }));
      } else {
        setErrors((prev) => ({ ...prev, cpf: "" }));
      }
    } else {
      setErrors((prev) => ({ ...prev, cpf: "" }));
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setProfileData((prev) => ({ ...prev, phone: formatted }));
    
    if (formatted.length >= 14) {
      if (!validatePhone(formatted)) {
        setErrors((prev) => ({ ...prev, phone: "Telefone inválido" }));
      } else {
        setErrors((prev) => ({ ...prev, phone: "" }));
      }
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate before saving
    if (profileData.cpf && profileData.cpf.length === 14 && !validateCPF(profileData.cpf)) {
      toast.error("CPF inválido");
      return;
    }

    if (profileData.phone && profileData.phone.length >= 14 && !validatePhone(profileData.phone)) {
      toast.error("Telefone inválido");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          cpf: profileData.cpf,
          nationality: profileData.nationality,
          marital_status: profileData.marital_status,
          birth_date: profileData.birth_date,
          profession: profileData.profession,
          identity_number: profileData.identity_number,
          identity_issuer: profileData.identity_issuer,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    
    setIsSavingAddress(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          address_cep: addressData.cep.replace(/\D/g, "") || null,
          address_street: addressData.street || null,
          address_number: addressData.number || null,
          address_complement: addressData.complement || null,
          address_neighborhood: addressData.neighborhood || null,
          address_city: addressData.city || null,
          address_state: addressData.state || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Endereço atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating address:", error);
      toast.error("Erro ao atualizar endereço");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSavePJData = async () => {
    if (!user) return;

    // Validate CNPJ if provided
    if (profileData.pj_cnpj && profileData.pj_cnpj.length === 18 && !validateCNPJ(profileData.pj_cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }
    
    setIsSavingPJ(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          pj_cnpj: profileData.pj_cnpj?.replace(/\D/g, "") || null,
          pj_razao_social: profileData.pj_razao_social || null,
          pj_nome_fantasia: profileData.pj_nome_fantasia || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Dados PJ atualizados com sucesso!");
    } catch (error) {
      console.error("Error updating PJ data:", error);
      toast.error("Erro ao atualizar dados PJ");
    } finally {
      setIsSavingPJ(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;
      
      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações de conta
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar Card */}
        <Card className="md:w-80">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profileData.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(profileData.full_name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              
              <div className="text-center">
                <h3 className="font-semibold text-lg">{profileData.full_name}</h3>
                <p className="text-sm text-muted-foreground">{profileData.email}</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {roles.map((role) => (
                  <span
                    key={role.role}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                  >
                    {getRoleLabel(role.role)}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1">
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="personal" className="gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </TabsTrigger>
              <TabsTrigger value="address" className="gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </TabsTrigger>
              <TabsTrigger value="pj" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Dados PJ
              </TabsTrigger>
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="h-4 w-4" />
                Segurança
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize seus dados pessoais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        value={profileData.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={profileData.cpf || ""}
                        onChange={(e) => handleCPFChange(e.target.value)}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className={errors.cpf ? "border-destructive" : ""}
                      />
                      {errors.cpf && (
                        <p className="text-sm text-destructive">{errors.cpf}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone || ""}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className={errors.phone ? "border-destructive" : ""}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Representative Data Section - for admins */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-4">Dados do Representante (para assinatura de contratos)</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nationality">Nacionalidade</Label>
                        <Input
                          id="nationality"
                          value={profileData.nationality || ""}
                          onChange={(e) => setProfileData((prev) => ({ ...prev, nationality: e.target.value }))}
                          placeholder="Ex: Brasileira"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="marital_status">Estado Civil</Label>
                        <Input
                          id="marital_status"
                          value={profileData.marital_status || ""}
                          onChange={(e) => setProfileData((prev) => ({ ...prev, marital_status: e.target.value }))}
                          placeholder="Ex: Casado, Solteiro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth_date">Data de Nascimento</Label>
                        <Input
                          id="birth_date"
                          type="date"
                          value={profileData.birth_date || ""}
                          onChange={(e) => setProfileData((prev) => ({ ...prev, birth_date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profession">Profissão</Label>
                        <Input
                          id="profession"
                          value={profileData.profession || ""}
                          onChange={(e) => setProfileData((prev) => ({ ...prev, profession: e.target.value }))}
                          placeholder="Ex: Empresário, Advogado"
                          disabled={!canEditRestrictedFields}
                          className={!canEditRestrictedFields ? "bg-muted" : ""}
                        />
                        {!canEditRestrictedFields && (
                          <p className="text-xs text-muted-foreground">
                            Somente Administradores ou Gestores podem alterar este campo
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="identity_number">RG</Label>
                        <Input
                          id="identity_number"
                          value={profileData.identity_number || ""}
                          onChange={(e) => setProfileData((prev) => ({ ...prev, identity_number: e.target.value }))}
                          placeholder="Número do RG"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="identity_issuer">Órgão Expedidor</Label>
                        <Input
                          id="identity_issuer"
                          value={profileData.identity_issuer || ""}
                          onChange={(e) => setProfileData((prev) => ({ ...prev, identity_issuer: e.target.value }))}
                          placeholder="Ex: SSP-SP, DRT-MS"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address">
              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                  <CardDescription>
                    Informe seu endereço completo. Digite o CEP para preencher automaticamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AddressForm
                    address={addressData}
                    onChange={setAddressData}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveAddress} disabled={isSavingAddress}>
                      {isSavingAddress ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar Endereço
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pj">
              <Card>
                <CardHeader>
                  <CardTitle>Dados de Pessoa Jurídica</CardTitle>
                  <CardDescription>
                    Preencha se você presta serviços como PJ (CNPJ próprio)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pj_cnpj">CNPJ</Label>
                      <Input
                        id="pj_cnpj"
                        value={profileData.pj_cnpj || ""}
                        onChange={(e) => handlePJCNPJChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className={errors.pj_cnpj ? "border-destructive" : ""}
                      />
                      {errors.pj_cnpj && (
                        <p className="text-sm text-destructive">{errors.pj_cnpj}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pj_razao_social">Razão Social</Label>
                      <Input
                        id="pj_razao_social"
                        value={profileData.pj_razao_social || ""}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            pj_razao_social: e.target.value,
                          }))
                        }
                        placeholder="Nome oficial da empresa"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="pj_nome_fantasia">Nome Fantasia</Label>
                      <Input
                        id="pj_nome_fantasia"
                        value={profileData.pj_nome_fantasia || ""}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            pj_nome_fantasia: e.target.value,
                          }))
                        }
                        placeholder="Nome comercial (opcional)"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSavePJData} disabled={isSavingPJ}>
                      {isSavingPJ ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar Dados PJ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Dados da Empresa</CardTitle>
                  <CardDescription>
                    Informações da empresa vinculada ao seu perfil
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {companyData ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome da Empresa</Label>
                        <Input value={companyData.name} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <Input value={companyData.cnpj} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input
                          value={companyData.email || "Não informado"}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          value={companyData.phone || "Não informado"}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Endereço</Label>
                        <Input
                          value={companyData.address || "Não informado"}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Nenhuma empresa vinculada ao seu perfil.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>
                    Atualize sua senha de acesso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleChangePassword}
                      disabled={isLoading || !passwordData.newPassword}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="mr-2 h-4 w-4" />
                      )}
                      Alterar Senha
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
