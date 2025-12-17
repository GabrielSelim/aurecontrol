import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, CreditCard, Tag, Percent, Package, Plus, Pencil, Trash2, Save } from "lucide-react";
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

const Configuracoes = () => {
  const [basePrice, setBasePrice] = useState<number>(49.90);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog states
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsResult, tiersResult, couponsResult, promotionsResult] = await Promise.all([
        supabase.from("system_settings").select("*").eq("key", "pj_contract_price").maybeSingle(),
        supabase.from("pricing_tiers").select("*").order("min_contracts"),
        supabase.from("discount_coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      ]);

      if (settingsResult.data) {
        const value = settingsResult.data.value as { amount: number };
        setBasePrice(value.amount);
      }

      if (tiersResult.data) setPricingTiers(tiersResult.data);
      if (couponsResult.data) setCoupons(couponsResult.data as Coupon[]);
      if (promotionsResult.data) setPromotions(promotionsResult.data as Promotion[]);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const saveBasePrice = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ value: { amount: basePrice, currency: "BRL" } })
        .eq("key", "pj_contract_price");

      if (error) throw error;
      toast.success("Preço base atualizado com sucesso!");
    } catch (error) {
      console.error("Error saving base price:", error);
      toast.error("Erro ao salvar preço base");
    } finally {
      setIsSaving(false);
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
        const { error } = await supabase
          .from("pricing_tiers")
          .update(tier)
          .eq("id", editingTier.id);
        if (error) throw error;
        toast.success("Pacote atualizado!");
      } else {
        const { error } = await supabase.from("pricing_tiers").insert([tier as any]);
        if (error) throw error;
        toast.success("Pacote criado!");
      }
      fetchData();
      setTierDialogOpen(false);
      setEditingTier(null);
    } catch (error) {
      console.error("Error saving tier:", error);
      toast.error("Erro ao salvar pacote");
    }
  };

  const deleteTier = async (id: string) => {
    try {
      const { error } = await supabase.from("pricing_tiers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Pacote removido!");
      fetchData();
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast.error("Erro ao remover pacote");
    }
  };

  // Coupon functions
  const saveCoupon = async (coupon: Partial<Coupon>) => {
    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from("discount_coupons")
          .update(coupon)
          .eq("id", editingCoupon.id);
        if (error) throw error;
        toast.success("Cupom atualizado!");
      } else {
        const { error } = await supabase.from("discount_coupons").insert([coupon as any]);
        if (error) throw error;
        toast.success("Cupom criado!");
      }
      fetchData();
      setCouponDialogOpen(false);
      setEditingCoupon(null);
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error("Erro ao salvar cupom");
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from("discount_coupons").delete().eq("id", id);
      if (error) throw error;
      toast.success("Cupom removido!");
      fetchData();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Erro ao remover cupom");
    }
  };

  // Promotion functions
  const savePromotion = async (promotion: Partial<Promotion>) => {
    try {
      if (editingPromotion) {
        const { error } = await supabase
          .from("promotions")
          .update(promotion)
          .eq("id", editingPromotion.id);
        if (error) throw error;
        toast.success("Promoção atualizada!");
      } else {
        const { error } = await supabase.from("promotions").insert([promotion as any]);
        if (error) throw error;
        toast.success("Promoção criada!");
      }
      fetchData();
      setPromotionDialogOpen(false);
      setEditingPromotion(null);
    } catch (error) {
      console.error("Error saving promotion:", error);
      toast.error("Erro ao salvar promoção");
    }
  };

  const deletePromotion = async (id: string) => {
    try {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Promoção removida!");
      fetchData();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast.error("Erro ao remover promoção");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie preços, pacotes, cupons e promoções
        </p>
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Preço Base
          </TabsTrigger>
          <TabsTrigger value="tiers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pacotes
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Cupons
          </TabsTrigger>
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Promoções
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
                <Button onClick={saveBasePrice} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Salvando..." : "Salvar"}
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
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTier(tier.id)}
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
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCoupon(coupon.id)}
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
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePromotion(promo.id)}
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

export default Configuracoes;
