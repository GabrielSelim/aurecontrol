import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Settings, CreditCard, Tag, Percent, Package, Plus, Pencil, Trash2, Save, Bell, MessageSquare, Send, Building2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import {
  useSystemSetting,
  useUpsertSystemSetting,
  usePricingTiers,
  useSavePricingTier,
  useDeletePricingTier,
  useDiscountCoupons,
  useSaveCoupon,
  useDeleteCoupon,
  usePromotions,
  useSavePromotion,
  useDeletePromotion,
  useSettingsAnnouncements,
  useSaveAnnouncement,
  useDeleteAnnouncement,
  useToggleAnnouncement,
  useActiveCompanies,
} from "@/hooks/queries";
import { sendUrgentAnnouncement } from "@/services/edgeFunctionService";

interface PricingTier {
  id: string;
  name: string;
  min_contracts: number;
  max_contracts: number | null;
  price_per_contract: number;
  is_active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  applies_to: "all" | "new_companies" | "existing_companies";
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_type: "all" | "company" | "role" | "company_role";
  target_company_id: string | null;
  target_roles: string[];
  priority: "low" | "normal" | "high" | "urgent";
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "financeiro", label: "Financeiro" },
  { value: "gestor", label: "Gestor" },
  { value: "colaborador", label: "Colaborador" },
  { value: "juridico", label: "Jurídico" },
];

const Configuracoes = () => {
  useDocumentTitle("Configurações");
  const { user } = useAuth();

  // ---- TanStack Query: server state ----
  const priceQuery = useSystemSetting("pj_contract_price");
  const reminderQuery = useSystemSetting("billing_reminder_days");
  const contractAlertQuery = useSystemSetting("contract_expiration_alert_days");
  const tiersQuery = usePricingTiers();
  const couponsQuery = useDiscountCoupons();
  const promotionsQuery = usePromotions();
  const announcementsQuery = useSettingsAnnouncements();
  const companiesQuery = useActiveCompanies();

  // ---- Mutations ----
  const upsertSetting = useUpsertSystemSetting();
  const saveTierMut = useSavePricingTier();
  const deleteTierMut = useDeletePricingTier();
  const saveCouponMut = useSaveCoupon();
  const deleteCouponMut = useDeleteCoupon();
  const savePromotionMut = useSavePromotion();
  const deletePromotionMut = useDeletePromotion();
  const saveAnnouncementMut = useSaveAnnouncement();
  const deleteAnnouncementMut = useDeleteAnnouncement();
  const toggleAnnouncementMut = useToggleAnnouncement();

  // ---- Derived server data ----
  const priceValue = priceQuery.data as unknown as { amount: number } | null;
  const reminderValue = reminderQuery.data as unknown as { days: number } | null;
  const contractAlertValue = contractAlertQuery.data as unknown as { days: number } | null;
  const pricingTiers = (tiersQuery.data ?? []) as PricingTier[];
  const coupons = (couponsQuery.data ?? []) as Coupon[];
  const promotions = (promotionsQuery.data ?? []) as Promotion[];
  const companiesData = (companiesQuery.data ?? []) as Company[];

  const announcements: Announcement[] = useMemo(() => {
    const raw = announcementsQuery.data ?? [];
    const companiesMap = new Map(companiesData.map((c) => [c.id, c.name]));
    return raw.map((a: Record<string, unknown>) => ({
      ...(a as unknown as Announcement),
      company_name: a.target_company_id
        ? companiesMap.get(a.target_company_id as string)
        : undefined,
    }));
  }, [announcementsQuery.data, companiesData]);

  const companies = companiesData;

  // ---- Local form state ----
  const [basePrice, setBasePrice] = useState<number>(49.90);
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [contractAlertDays, setContractAlertDays] = useState<number>(30);

  // Sync local form state from queries (one-time seed)
  const basePriceSeeded = useState(false);
  if (!basePriceSeeded[0] && priceValue) {
    setBasePrice(priceValue.amount);
    basePriceSeeded[1](true);
  }
  const reminderSeeded = useState(false);
  if (!reminderSeeded[0] && reminderValue) {
    setReminderDays(reminderValue.days);
    reminderSeeded[1](true);
  }
  const alertSeeded = useState(false);
  if (!alertSeeded[0] && contractAlertValue) {
    setContractAlertDays(contractAlertValue.days);
    alertSeeded[1](true);
  }

  // ---- Loading / error ----
  const isLoading =
    priceQuery.isLoading ||
    tiersQuery.isLoading ||
    couponsQuery.isLoading ||
    promotionsQuery.isLoading ||
    announcementsQuery.isLoading ||
    companiesQuery.isLoading;

  const loadError =
    priceQuery.isError ||
    tiersQuery.isError ||
    couponsQuery.isError ||
    promotionsQuery.isError ||
    announcementsQuery.isError ||
    companiesQuery.isError;

  // Dialog states
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const saveBasePrice = async () => {
    try {
      await upsertSetting.mutateAsync({ key: "pj_contract_price", value: { amount: basePrice, currency: "BRL" } });
      toast.success("Preço base atualizado com sucesso!");
    } catch (error) {
      logger.error("Error saving base price:", error);
      toast.error("Erro ao salvar preço base");
    }
  };

  const saveReminderDays = async () => {
    try {
      await upsertSetting.mutateAsync({ key: "billing_reminder_days", value: { days: reminderDays } });
      toast.success("Configuração de lembrete atualizada!");
    } catch (error) {
      logger.error("Error saving reminder days:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  const saveContractAlertDays = async () => {
    try {
      await upsertSetting.mutateAsync({ key: "contract_expiration_alert_days", value: { days: contractAlertDays } });
      toast.success("Configuração de alerta de contratos atualizada!");
    } catch (error) {
      logger.error("Error saving contract alert days:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  // Tier functions
  const saveTier = async (tier: Partial<PricingTier>) => {
    try {
      if (editingTier) {
        await saveTierMut.mutateAsync({ ...tier, id: editingTier.id });
        toast.success("Pacote atualizado!");
      } else {
        await saveTierMut.mutateAsync(tier as Record<string, unknown>);
        toast.success("Pacote criado!");
      }
      setTierDialogOpen(false);
      setEditingTier(null);
    } catch (error) {
      logger.error("Error saving tier:", error);
      toast.error("Erro ao salvar pacote");
    }
  };

  const deleteTier = async (id: string) => {
    try {
      await deleteTierMut.mutateAsync(id);
      toast.success("Pacote removido!");
    } catch (error) {
      logger.error("Error deleting tier:", error);
      toast.error("Erro ao remover pacote");
    }
  };

  // Coupon functions
  const saveCoupon = async (coupon: Partial<Coupon>) => {
    try {
      if (editingCoupon) {
        await saveCouponMut.mutateAsync({ ...coupon, id: editingCoupon.id });
        toast.success("Cupom atualizado!");
      } else {
        await saveCouponMut.mutateAsync(coupon as Record<string, unknown>);
        toast.success("Cupom criado!");
      }
      setCouponDialogOpen(false);
      setEditingCoupon(null);
    } catch (error) {
      logger.error("Error saving coupon:", error);
      toast.error("Erro ao salvar cupom");
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await deleteCouponMut.mutateAsync(id);
      toast.success("Cupom removido!");
    } catch (error) {
      logger.error("Error deleting coupon:", error);
      toast.error("Erro ao remover cupom");
    }
  };

  // Promotion functions
  const savePromotion = async (promotion: Partial<Promotion>) => {
    try {
      if (editingPromotion) {
        await savePromotionMut.mutateAsync({ ...promotion, id: editingPromotion.id });
        toast.success("Promoção atualizada!");
      } else {
        await savePromotionMut.mutateAsync(promotion as Record<string, unknown>);
        toast.success("Promoção criada!");
      }
      setPromotionDialogOpen(false);
      setEditingPromotion(null);
    } catch (error) {
      logger.error("Error saving promotion:", error);
      toast.error("Erro ao salvar promoção");
    }
  };

  const deletePromotion = async (id: string) => {
    try {
      await deletePromotionMut.mutateAsync(id);
      toast.success("Promoção removida!");
    } catch (error) {
      logger.error("Error deleting promotion:", error);
      toast.error("Erro ao remover promoção");
    }
  };

  // Announcement functions
  const saveAnnouncement = async (announcement: Partial<Announcement>) => {
    try {
      const dataToSave = {
        ...announcement,
        created_by: user?.id,
      };
      const { company_name: _, ...cleanData } = dataToSave as Partial<Announcement> & { company_name?: string };

      if (editingAnnouncement) {
        await saveAnnouncementMut.mutateAsync({ ...cleanData, id: editingAnnouncement.id });
        toast.success("Mensagem atualizada!");
      } else {
        const savedData = await saveAnnouncementMut.mutateAsync(cleanData as Record<string, unknown>);
        toast.success("Mensagem enviada!");

        // Send email notifications for urgent announcements
        if (announcement.priority === "urgent" && announcement.is_active) {
          toast.info("Enviando notificações por email...");
          try {
            await sendUrgentAnnouncement(savedData.id);
            toast.success("Emails de notificação enviados!");
          } catch (emailErr) {
            logger.error("Error calling email function:", emailErr);
            toast.error("Erro ao enviar emails de notificação");
          }
        }
      }
      setAnnouncementDialogOpen(false);
      setEditingAnnouncement(null);
    } catch (error) {
      logger.error("Error saving announcement:", error);
      toast.error("Erro ao salvar mensagem");
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncementMut.mutateAsync(id);
      toast.success("Mensagem removida!");
    } catch (error) {
      logger.error("Error deleting announcement:", error);
      toast.error("Erro ao remover mensagem");
    }
  };

  const toggleAnnouncementStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleAnnouncementMut.mutateAsync({ id, isActive });
      toast.success(isActive ? "Mensagem ativada!" : "Mensagem desativada!");
    } catch (error) {
      logger.error("Error toggling announcement:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Erro ao carregar configurações" onRetry={() => { priceQuery.refetch(); tiersQuery.refetch(); couponsQuery.refetch(); promotionsQuery.refetch(); announcementsQuery.refetch(); companiesQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie preços, pacotes, cupons, promoções e mensagens
        </p>
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Preço Base</span>
          </TabsTrigger>
          <TabsTrigger value="tiers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Pacotes</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Cupons</span>
          </TabsTrigger>
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Promoções</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Mensagens</span>
          </TabsTrigger>
        </TabsList>

        {/* Preço Base */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Preço Base por Contrato PJ</CardTitle>
              <CardDescription>
                Define o valor padrão cobrado por cada contrato PJ ativo no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Valor por Contrato PJ</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                      className="pl-10 w-40"
                    />
                  </div>
                </div>
                <Button onClick={saveBasePrice} disabled={upsertSetting.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {upsertSetting.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Este valor será usado como referência para empresas que não se enquadram em nenhum pacote promocional.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pacotes */}
        <TabsContent value="tiers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pacotes de Preço</CardTitle>
                <CardDescription>
                  Defina faixas de preço baseadas na quantidade de contratos PJ
                </CardDescription>
              </div>
              <Button onClick={() => { setEditingTier(null); setTierDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pacote
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pricingTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tier.name}</p>
                          <Badge variant={tier.is_active ? "default" : "secondary"}>
                            {tier.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tier.min_contracts} - {tier.max_contracts || "∞"} contratos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(tier.price_per_contract)}/contrato
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingTier(tier); setTierDialogOpen(true); }}
                          aria-label="Editar pacote"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTier(tier.id)}
                          aria-label="Excluir pacote"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cupons */}
        <TabsContent value="coupons">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cupons de Desconto</CardTitle>
                <CardDescription>
                  Crie códigos promocionais para empresas
                </CardDescription>
              </div>
              <Button onClick={() => { setEditingCoupon(null); setCouponDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cupom
              </Button>
            </CardHeader>
            <CardContent>
              {coupons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cupom criado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Tag className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold">{coupon.code}</p>
                            <Badge variant={coupon.is_active ? "default" : "secondary"}>
                              {coupon.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {coupon.description || "Sem descrição"} • {coupon.current_uses}/{coupon.max_uses || "∞"} usos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-green-600">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : formatCurrency(coupon.discount_value)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingCoupon(coupon); setCouponDialogOpen(true); }}
                            aria-label="Editar cupom"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCoupon(coupon.id)}
                            aria-label="Excluir cupom"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promoções */}
        <TabsContent value="promotions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Promoções</CardTitle>
                <CardDescription>
                  Configure promoções por período
                </CardDescription>
              </div>
              <Button onClick={() => { setEditingPromotion(null); setPromotionDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Promoção
              </Button>
            </CardHeader>
            <CardContent>
              {promotions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma promoção criada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {promotions.map((promo) => (
                    <div
                      key={promo.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Percent className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{promo.name}</p>
                            <Badge variant={promo.is_active ? "default" : "secondary"}>
                              {promo.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-green-600">
                          {promo.discount_type === "percentage"
                            ? `${promo.discount_value}%`
                            : formatCurrency(promo.discount_value)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingPromotion(promo); setPromotionDialogOpen(true); }}
                            aria-label="Editar promoção"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePromotion(promo.id)}
                            aria-label="Excluir promoção"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações de Notificações
              </CardTitle>
              <CardDescription>
                Configure quando e como as notificações automáticas são enviadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reminderDays" className="text-base font-medium">
                    Lembrete de Vencimento de Faturas
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Quantos dias antes do vencimento o sistema deve enviar lembretes por email
                  </p>
                  <div className="flex items-end gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="reminderDays"
                          type="number"
                          min="1"
                          max="30"
                          value={reminderDays}
                          onChange={(e) => setReminderDays(parseInt(e.target.value) || 3)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">dias antes</span>
                      </div>
                    </div>
                    <Button onClick={saveReminderDays} disabled={upsertSetting.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {upsertSetting.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label htmlFor="contractAlertDays" className="text-base font-medium">
                    Alerta de Vencimento de Contratos
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Quantos dias antes do vencimento o sistema deve alertar sobre contratos PJ expirando
                  </p>
                  <div className="flex items-end gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="contractAlertDays"
                          type="number"
                          min="7"
                          max="90"
                          value={contractAlertDays}
                          onChange={(e) => setContractAlertDays(parseInt(e.target.value) || 30)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">dias antes</span>
                      </div>
                    </div>
                    <Button onClick={saveContractAlertDays} disabled={upsertSetting.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {upsertSetting.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Tipos de Notificações Automáticas</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <strong>Fatura Gerada:</strong> Enviada quando uma nova fatura é criada (1º do mês)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <strong>Lembrete de Vencimento de Faturas:</strong> Enviada {reminderDays} dia(s) antes do vencimento (diariamente às 8h)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <strong>Alerta de Contratos:</strong> Enviada {contractAlertDays} dia(s) antes do vencimento de contratos PJ (diariamente às 7h)
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mensagens Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mensagens do Sistema</CardTitle>
                <CardDescription>
                  Envie comunicados para usuários do sistema
                </CardDescription>
              </div>
              <Button onClick={() => { setEditingAnnouncement(null); setAnnouncementDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Mensagem
              </Button>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma mensagem enviada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{announcement.title}</h4>
                            <Badge variant={announcement.is_active ? "default" : "secondary"}>
                              {announcement.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                            <Badge variant="outline" className={
                              announcement.priority === "urgent" ? "border-red-500 text-red-500" :
                              announcement.priority === "high" ? "border-orange-500 text-orange-500" :
                              announcement.priority === "low" ? "border-muted-foreground" : ""
                            }>
                              {announcement.priority === "urgent" ? "Urgente" :
                               announcement.priority === "high" ? "Alta" :
                               announcement.priority === "low" ? "Baixa" : "Normal"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {announcement.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {announcement.target_type === "all" && (
                                <><Users className="h-3 w-3" /> Todos os usuários</>
                              )}
                              {announcement.target_type === "company" && (
                                <><Building2 className="h-3 w-3" /> {announcement.company_name || "Empresa"}</>
                              )}
                              {announcement.target_type === "role" && (
                                <><Users className="h-3 w-3" /> {announcement.target_roles?.map(r => 
                                  ROLE_OPTIONS.find(o => o.value === r)?.label || r
                                ).join(", ")}</>
                              )}
                              {announcement.target_type === "company_role" && (
                                <><Building2 className="h-3 w-3" /> {announcement.company_name || "Empresa"} - {announcement.target_roles?.map(r => 
                                  ROLE_OPTIONS.find(o => o.value === r)?.label || r
                                ).join(", ")}</>
                              )}
                            </span>
                            <span>
                              Criada em {new Date(announcement.created_at).toLocaleDateString("pt-BR")}
                            </span>
                            {announcement.expires_at && (
                              <span>
                                Expira em {new Date(announcement.expires_at).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={announcement.is_active}
                            onCheckedChange={(checked) => toggleAnnouncementStatus(announcement.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingAnnouncement(announcement); setAnnouncementDialogOpen(true); }}
                            aria-label="Editar mensagem"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAnnouncement(announcement.id)}
                            aria-label="Excluir mensagem"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tier Dialog */}
      <TierDialog
        open={tierDialogOpen}
        onOpenChange={setTierDialogOpen}
        tier={editingTier}
        onSave={saveTier}
      />

      {/* Coupon Dialog */}
      <CouponDialog
        open={couponDialogOpen}
        onOpenChange={setCouponDialogOpen}
        coupon={editingCoupon}
        onSave={saveCoupon}
      />

      {/* Promotion Dialog */}
      <PromotionDialog
        open={promotionDialogOpen}
        onOpenChange={setPromotionDialogOpen}
        promotion={editingPromotion}
        onSave={savePromotion}
      />

      {/* Announcement Dialog */}
      <AnnouncementDialog
        open={announcementDialogOpen}
        onOpenChange={setAnnouncementDialogOpen}
        announcement={editingAnnouncement}
        companies={companies}
        onSave={saveAnnouncement}
      />
    </div>
  );
};

// Tier Dialog Component
function TierDialog({
  open,
  onOpenChange,
  tier,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: PricingTier | null;
  onSave: (tier: Partial<PricingTier>) => void;
}) {
  const [name, setName] = useState("");
  const [minContracts, setMinContracts] = useState(1);
  const [maxContracts, setMaxContracts] = useState<number | "">("");
  const [price, setPrice] = useState(49.90);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (tier) {
      setName(tier.name);
      setMinContracts(tier.min_contracts);
      setMaxContracts(tier.max_contracts ?? "");
      setPrice(tier.price_per_contract);
      setIsActive(tier.is_active);
    } else {
      setName("");
      setMinContracts(1);
      setMaxContracts("");
      setPrice(49.90);
      setIsActive(true);
    }
  }, [tier, open]);

  const handleSave = () => {
    onSave({
      name,
      min_contracts: minContracts,
      max_contracts: maxContracts === "" ? null : maxContracts,
      price_per_contract: price,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tier ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          <DialogDescription>
            Configure as faixas de preço por quantidade de contratos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Pacote</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Empresarial" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mínimo de Contratos</Label>
              <Input
                type="number"
                value={minContracts}
                onChange={(e) => setMinContracts(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Máximo de Contratos</Label>
              <Input
                type="number"
                value={maxContracts}
                onChange={(e) => setMaxContracts(e.target.value === "" ? "" : parseInt(e.target.value))}
                placeholder="Ilimitado"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preço por Contrato (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Pacote ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Coupon Dialog Component
function CouponDialog({
  open,
  onOpenChange,
  coupon,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon | null;
  onSave: (coupon: Partial<Coupon>) => void;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [maxUses, setMaxUses] = useState<number | "">("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code);
      setDescription(coupon.description || "");
      setDiscountType(coupon.discount_type);
      setDiscountValue(coupon.discount_value);
      setMaxUses(coupon.max_uses ?? "");
      setValidUntil(coupon.valid_until ? coupon.valid_until.split("T")[0] : "");
      setIsActive(coupon.is_active);
    } else {
      setCode("");
      setDescription("");
      setDiscountType("percentage");
      setDiscountValue(10);
      setMaxUses("");
      setValidUntil("");
      setIsActive(true);
    }
  }, [coupon, open]);

  const handleSave = () => {
    onSave({
      code: code.toUpperCase(),
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: maxUses === "" ? null : maxUses,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{coupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
          <DialogDescription>
            Crie códigos promocionais para empresas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Código do Cupom</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: DESCONTO20"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Cupom de boas-vindas" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do Desconto</Label>
              <Input
                type="number"
                step={discountType === "percentage" ? "1" : "0.01"}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limite de Usos</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value === "" ? "" : parseInt(e.target.value))}
                placeholder="Ilimitado"
              />
            </div>
            <div className="space-y-2">
              <Label>Válido Até</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Cupom ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Promotion Dialog Component
function PromotionDialog({
  open,
  onOpenChange,
  promotion,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: Promotion | null;
  onSave: (promotion: Partial<Promotion>) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliesTo, setAppliesTo] = useState<"all" | "new_companies" | "existing_companies">("all");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (promotion) {
      setName(promotion.name);
      setDescription(promotion.description || "");
      setDiscountType(promotion.discount_type);
      setDiscountValue(promotion.discount_value);
      setStartDate(promotion.start_date.split("T")[0]);
      setEndDate(promotion.end_date.split("T")[0]);
      setAppliesTo(promotion.applies_to);
      setIsActive(promotion.is_active);
    } else {
      setName("");
      setDescription("");
      setDiscountType("percentage");
      setDiscountValue(10);
      setStartDate("");
      setEndDate("");
      setAppliesTo("all");
      setIsActive(true);
    }
  }, [promotion, open]);

  const handleSave = () => {
    onSave({
      name,
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      applies_to: appliesTo,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{promotion ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
          <DialogDescription>
            Configure promoções por período
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Promoção</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Black Friday 2024" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Desconto especial de fim de ano" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do Desconto</Label>
              <Input
                type="number"
                step={discountType === "percentage" ? "1" : "0.01"}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Aplica-se a</Label>
            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as typeof appliesTo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                <SelectItem value="new_companies">Apenas novas empresas</SelectItem>
                <SelectItem value="existing_companies">Apenas empresas existentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Promoção ativa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Announcement Dialog Component
function AnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  companies,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
  companies: Company[];
  onSave: (announcement: Partial<Announcement>) => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "company" | "role" | "company_role">("all");
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setMessage(announcement.message);
      setTargetType(announcement.target_type);
      setTargetCompanyId(announcement.target_company_id || "");
      setTargetRoles(announcement.target_roles || []);
      setPriority(announcement.priority);
      setIsActive(announcement.is_active);
      setExpiresAt(announcement.expires_at ? announcement.expires_at.split("T")[0] : "");
    } else {
      setTitle("");
      setMessage("");
      setTargetType("all");
      setTargetCompanyId("");
      setTargetRoles([]);
      setPriority("normal");
      setIsActive(true);
      setExpiresAt("");
    }
  }, [announcement, open]);

  const handleRoleToggle = (role: string) => {
    setTargetRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };

  const handleSave = () => {
    if (!title.trim() || !message.trim()) {
      return;
    }

    const needsCompany = targetType === "company" || targetType === "company_role";
    const needsRoles = targetType === "role" || targetType === "company_role";

    onSave({
      title: title.trim(),
      message: message.trim(),
      target_type: targetType,
      target_company_id: needsCompany ? targetCompanyId || null : null,
      target_roles: needsRoles ? targetRoles : [],
      priority,
      is_active: isActive,
      expires_at: expiresAt || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{announcement ? "Editar Mensagem" : "Nova Mensagem"}</DialogTitle>
          <DialogDescription>
            {announcement ? "Atualize a mensagem do sistema" : "Envie uma mensagem para os usuários do sistema"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da mensagem"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Mensagem *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Conteúdo da mensagem..."
              rows={4}
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label>Destinatários</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType(v as typeof targetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                <SelectItem value="company">Empresa específica (todos os cargos)</SelectItem>
                <SelectItem value="role">Cargos específicos (todas as empresas)</SelectItem>
                <SelectItem value="company_role">Empresa + Cargos específicos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(targetType === "company" || targetType === "company_role") && (
            <div className="space-y-2">
              <Label>Selecione a Empresa</Label>
              <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(targetType === "role" || targetType === "company_role") && (
            <div className="space-y-2">
              <Label>Selecione os Cargos</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                {ROLE_OPTIONS.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={targetRoles.includes(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <label
                      htmlFor={`role-${role.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente (envia email)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Expiração (opcional)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {priority === "urgent" && !announcement && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
              <Bell className="h-4 w-4 flex-shrink-0" />
              <span>Mensagens urgentes enviarão notificação por email para todos os destinatários selecionados.</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Mensagem ativa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!title.trim() || !message.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {announcement ? "Salvar" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Configuracoes;
