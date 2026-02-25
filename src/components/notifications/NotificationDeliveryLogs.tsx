import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Eye, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeliveryLog {
  id: string;
  notification_log_id: string;
  attempt_number: number;
  status: string;
  channel: string;
  error_message: string | null;
  error_code: string | null;
  response_data: Record<string, unknown> | null;
  attempted_at: string;
  delivered_at: string | null;
  idempotency_key: string | null;
}

interface NotificationWithDelivery {
  id: string;
  notification_type: string;
  event_type: string | null;
  recipient_email: string;
  subject: string;
  status: string;
  channel: string | null;
  retry_count: number | null;
  max_retries: number | null;
  created_at: string;
  delivered_at: string | null;
  idempotency_key: string | null;
  companies?: { name: string } | null;
}

export function NotificationDeliveryLogs() {
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["notification-logs-detailed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*, companies:company_id(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as NotificationWithDelivery[];
    },
  });

  const { data: deliveryLogs } = useQuery({
    queryKey: ["delivery-logs", selectedNotification],
    queryFn: async () => {
      if (!selectedNotification) return [];
      const { data, error } = await supabase
        .from("notification_delivery_logs")
        .select("*")
        .eq("notification_log_id", selectedNotification)
        .order("attempt_number", { ascending: true });
      if (error) throw error;
      return data as DeliveryLog[];
    },
    enabled: !!selectedNotification,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "retrying":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      sent: "default",
      delivered: "default",
      failed: "destructive",
      pending: "secondary",
      retrying: "outline",
    };
    const labels: Record<string, string> = {
      sent: "Enviado",
      delivered: "Entregue",
      failed: "Falhou",
      pending: "Pendente",
      retrying: "Reenviando",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getEventLabel = (type: string) => {
    const labels: Record<string, string> = {
      contract_sent: "Contrato Enviado",
      signature_completed: "Assinatura Concluída",
      signature_pending: "Assinatura Pendente",
      billing_generated: "Fatura Gerada",
      billing_due_reminder: "Lembrete Vencimento",
      payment_approved: "Pagamento Aprovado",
      payment_rejected: "Pagamento Rejeitado",
      contract_expiration: "Contrato Expirando",
      contract_completed: "Contrato Concluído",
      invite: "Convite",
      system_announcement: "Aviso do Sistema",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs de Entrega</CardTitle>
              <CardDescription>
                Histórico detalhado de entrega com tentativas de retry
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(n.status)}
                          {getStatusBadge(n.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getEventLabel(n.event_type || n.notification_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">
                        {n.recipient_email}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {n.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {n.channel || "email"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {(n.retry_count || 0)}/{n.max_retries || 3}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(n.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedNotification(n.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhum log de entrega encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes de Entrega</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {deliveryLogs && deliveryLogs.length > 0 ? (
              <div className="space-y-3">
                {deliveryLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Tentativa #{log.attempt_number}
                      </span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Enviado em:</span>{" "}
                        {format(new Date(log.attempted_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </p>
                      {log.delivered_at && (
                        <p>
                          <span className="font-medium">Entregue em:</span>{" "}
                          {format(new Date(log.delivered_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-destructive">
                          <span className="font-medium">Erro:</span> {log.error_message}
                        </p>
                      )}
                      {log.idempotency_key && (
                        <p>
                          <span className="font-medium">Chave:</span>{" "}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {log.idempotency_key}
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum log de entrega detalhado disponível para esta notificação.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
