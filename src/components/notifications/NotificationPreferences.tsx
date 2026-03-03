import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNotificationPreferences, upsertNotificationPreferences } from "@/services/notificationService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, Mail, Monitor, Save, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

const NOTIFICATION_TYPES = [
  {
    key: "contract_sent",
    label: "Contrato Enviado",
    description: "Quando um contrato é enviado para assinatura",
  },
  {
    key: "signature_completed",
    label: "Assinatura Concluída",
    description: "Quando todas as assinaturas de um contrato são concluídas",
  },
  {
    key: "signature_pending",
    label: "Assinatura Pendente",
    description: "Quando há uma assinatura pendente para você",
  },
  {
    key: "billing_generated",
    label: "Fatura Gerada",
    description: "Quando uma nova fatura é gerada",
  },
  {
    key: "billing_due_reminder",
    label: "Lembrete de Vencimento",
    description: "Lembretes de faturas próximas do vencimento",
  },
  {
    key: "payment_approved",
    label: "Pagamento Aprovado",
    description: "Quando um pagamento é aprovado",
  },
  {
    key: "payment_rejected",
    label: "Pagamento Rejeitado",
    description: "Quando um pagamento é rejeitado",
  },
  {
    key: "contract_expiration",
    label: "Contrato Expirando",
    description: "Alertas de contratos próximos do vencimento",
  },
  {
    key: "system_announcement",
    label: "Avisos do Sistema",
    description: "Comunicados e avisos gerais do sistema",
  },
];

interface Preference {
  notification_type: string;
  channel_email: boolean;
  channel_in_app: boolean;
  is_enabled: boolean;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, Preference>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const data = await fetchNotificationPreferences(user!.id);

      const prefsMap: Record<string, Preference> = {};
      
      // Initialize all types with defaults
      NOTIFICATION_TYPES.forEach((type) => {
        prefsMap[type.key] = {
          notification_type: type.key,
          channel_email: true,
          channel_in_app: true,
          is_enabled: true,
        };
      });

      // Override with saved preferences
      data?.forEach((pref: { notification_type: string; channel_email: boolean; channel_in_app: boolean; is_enabled: boolean }) => {
        prefsMap[pref.notification_type] = {
          notification_type: pref.notification_type,
          channel_email: pref.channel_email,
          channel_in_app: pref.channel_in_app,
          is_enabled: pref.is_enabled,
        };
      });

      setPreferences(prefsMap);
    } catch (error) {
      logger.error("Error fetching preferences:", error);
      toast.error("Erro ao carregar preferências");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (type: string, field: keyof Preference) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: !prev[type][field],
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      await upsertNotificationPreferences(
        user.id,
        Object.values(preferences).map((pref) => ({
          notification_type: pref.notification_type,
          channel_email: pref.channel_email,
          channel_in_app: pref.channel_in_app,
          is_enabled: pref.is_enabled,
        }))
      );
      toast.success("Preferências salvas com sucesso!");
    } catch (error) {
      logger.error("Error saving preferences:", error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preferências de Notificação
            </CardTitle>
            <CardDescription>
              Escolha quais notificações deseja receber e por qual canal
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header */}
        <div className="grid grid-cols-[1fr,80px,80px,80px] gap-4 pb-3 mb-3 border-b text-sm font-medium text-muted-foreground">
          <span>Tipo de Notificação</span>
          <span className="text-center">Ativo</span>
          <span className="text-center flex items-center justify-center gap-1">
            <Mail className="h-3.5 w-3.5" /> Email
          </span>
          <span className="text-center flex items-center justify-center gap-1">
            <Monitor className="h-3.5 w-3.5" /> No App
          </span>
        </div>

        <div className="space-y-1">
          {NOTIFICATION_TYPES.map((type) => {
            const pref = preferences[type.key];
            if (!pref) return null;

            return (
              <div
                key={type.key}
                className="grid grid-cols-[1fr,80px,80px,80px] gap-4 items-center py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <Label className="text-sm font-medium">{type.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.is_enabled}
                    onCheckedChange={() => handleToggle(type.key, "is_enabled")}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.channel_email}
                    onCheckedChange={() => handleToggle(type.key, "channel_email")}
                    disabled={!pref.is_enabled}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.channel_in_app}
                    onCheckedChange={() => handleToggle(type.key, "channel_in_app")}
                    disabled={!pref.is_enabled}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
