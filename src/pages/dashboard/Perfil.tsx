import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile, uploadAvatar } from "@/services/profileService";
import { fetchCompany as fetchCompanyData } from "@/services/companyService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Building2, Lock, Camera, Loader2, Save, Briefcase, MapPin, Bell, ShieldCheck, Smartphone } from "lucide-react";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { formatCPF, formatPhone, formatCNPJ, validateCPF, validatePhone, validateCNPJ } from "@/lib/masks";
import { AddressForm } from "@/components/AddressForm";
import { AddressData } from "@/hooks/useCepLookup";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/handleApiError";

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
  useDocumentTitle("Meu Perfil");
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

  // 2FA / MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQR, setMfaQR] = useState<{ qr: string; secret: string; factorId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  const [errors, setErrors] = useState({
    cpf: "",
    phone: "",
    pj_cnpj: "",
  });

  // Load MFA status on mount
  useEffect(() => {
    loadMfaStatus();
  }, []);

  const loadMfaStatus = async () => {
    setMfaLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.all?.find(f => f.factor_type === "totp" && f.status === "verified");
      setMfaEnabled(!!verified);
      setMfaFactorId(verified?.id ?? null);
    } catch (err) {
      logger.error("MFA status:", err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnrollMFA = async () => {
    setMfaEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Aure" });
      if (error) throw error;
      if (data?.totp) {
        setMfaQR({ qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
      }
    } catch (err) {
      logger.error("MFA enroll:", err);
      toast.error("Erro ao configurar autenticação em dois fatores.");
    } finally {
      setMfaEnrolling(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!mfaQR || !mfaCode) return;
    setMfaVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaQR.factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaQR.factorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;
      toast.success("Autenticação em dois fatores ativada com sucesso!");
      setMfaQR(null);
      setMfaCode("");
      await loadMfaStatus();
    } catch (err) {
      logger.error("MFA verify:", err);
      toast.error("Código inválido. Verifique o app autenticador e tente novamente.");
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!mfaFactorId) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) throw error;
      setMfaEnabled(false);
      setMfaFactorId(null);
      toast.success("Autenticação em dois fatores desativada.");
    } catch (err) {
      logger.error("MFA unenroll:", err);
      toast.error("Erro ao desativar autenticação em dois fatores.");
    }
  };

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
        nationality: profile.nationality || null,
        marital_status: profile.marital_status || null,
        birth_date: profile.birth_date || null,
        profession: profile.profession || null,
        identity_number: profile.identity_number || null,
        identity_issuer: profile.identity_issuer || null,
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
      const data = await fetchCompanyData(profile.company_id);
      setCompanyData(data);
    } catch (error) {
      logger.error("Error fetching company:", error);
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

      const publicUrl = await uploadAvatar(fileName, file);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      await updateProfile(user.id, { avatar_url: avatarUrl });

      setProfileData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Foto atualizada com sucesso!");
    } catch (error) {
      logger.error("Error uploading avatar:", error);
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
      await updateProfile(user.id, {
          full_name: profileData.full_name,
          phone: profileData.phone,
          cpf: profileData.cpf,
          nationality: profileData.nationality,
          marital_status: profileData.marital_status,
          birth_date: profileData.birth_date,
          profession: profileData.profession,
          identity_number: profileData.identity_number,
          identity_issuer: profileData.identity_issuer,
      });
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      logger.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    
    setIsSavingAddress(true);
    try {
      await updateProfile(user.id, {
          address_cep: addressData.cep.replace(/\D/g, "") || null,
          address_street: addressData.street || null,
          address_number: addressData.number || null,
          address_complement: addressData.complement || null,
          address_neighborhood: addressData.neighborhood || null,
          address_city: addressData.city || null,
          address_state: addressData.state || null,
      });
      toast.success("Endereço atualizado com sucesso!");
    } catch (error) {
      logger.error("Error updating address:", error);
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
      await updateProfile(user.id, {
          pj_cnpj: profileData.pj_cnpj?.replace(/\D/g, "") || null,
          pj_razao_social: profileData.pj_razao_social || null,
          pj_nome_fantasia: profileData.pj_nome_fantasia || null,
      });
      toast.success("Dados PJ atualizados com sucesso!");
    } catch (error) {
      logger.error("Error updating PJ data:", error);
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
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao alterar senha"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-80" />
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          <Card className="md:w-80">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
                  aria-label="Alterar foto de perfil"
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
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notificações
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

              {/* 2FA / MFA Card */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Autenticação em Dois Fatores (2FA)
                  </CardTitle>
                  <CardDescription>
                    Adicione uma camada extra de segurança com um app autenticador (Google Authenticator, Authy, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mfaLoading ? (
                    <Skeleton className="h-10 w-40" />
                  ) : mfaEnabled ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="font-medium">2FA ativo</span>
                        <Badge variant="default" className="bg-green-600">Protegido</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sua conta está protegida por autenticação em dois fatores.
                      </p>
                      <Button variant="destructive" size="sm" onClick={handleDisableMFA}>
                        Desativar 2FA
                      </Button>
                    </div>
                  ) : mfaQR ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">1. Escaneie o QR Code no seu app autenticador</p>
                        <p>Ou insira o código manualmente: <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{mfaQR.secret}</code></p>
                      </div>
                      <div className="flex justify-center">
                        <img src={mfaQR.qr} alt="QR Code 2FA" className="w-48 h-48 border rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">2. Digite o código de 6 dígitos gerado pelo app</p>
                        <div className="flex gap-2">
                          <Input
                            value={mfaCode}
                            onChange={e => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="font-mono text-center text-lg w-32"
                          />
                          <Button onClick={handleVerifyMFA} disabled={mfaVerifying || mfaCode.length < 6}>
                            {mfaVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
                          </Button>
                          <Button variant="outline" onClick={() => { setMfaQR(null); setMfaCode(""); }}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Sua conta não possui autenticação em dois fatores. Recomendamos ativar para maior segurança.
                      </p>
                      <Button onClick={handleEnrollMFA} disabled={mfaEnrolling}>
                        {mfaEnrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                        Ativar Autenticação 2FA
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationPreferences />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
