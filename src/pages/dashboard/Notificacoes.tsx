import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNotificationLogs } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/hooks/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, Search, Filter, Calendar, Building2, BarChart3, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotificationDeliveryLogs } from "@/components/notifications/NotificationDeliveryLogs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";

interface NotificationLog {
  id: string;
  company_id: string | null;
  recipient_email: string;
  notification_type: string;
  event_type: string | null;
  subject: string;
  status: string;
  channel: string | null;
  retry_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  delivered_at: string | null;
  companies?: {
    name: string;
  } | null;
}

export default function Notificacoes() {
  useDocumentTitle("Notificações");
  const { hasRole } = useAuth();
  const isMasterAdmin = hasRole("master_admin");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: notifications, isLoading } = useQuery({
    queryKey: queryKeys.notifications.logs(typeFilter),
    queryFn: async () => {
      const data = await fetchNotificationLogs(typeFilter);
      return data as NotificationLog[];
    },
  });

  const filteredNotifications = useMemo(() => notifications?.filter((n) => {
    const matchesSearch =
      n.recipient_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      n.subject.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      n.companies?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    return matchesSearch;
  }), [notifications, debouncedSearchTerm]);

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case "billing_generated": return "default";
      case "billing_due_reminder": return "secondary";
      case "contract_completed": return "default";
      case "invite": return "outline";
      default: return "secondary";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      billing_generated: "Fatura Gerada",
      billing_due_reminder: "Lembrete Vencimento",
      contract_completed: "Contrato Concluído",
      contract_sent: "Contrato Enviado",
      signature_completed: "Assinatura Concluída",
      payment_approved: "Pagamento Aprovado",
      payment_rejected: "Pagamento Rejeitado",
      invite: "Convite",
    };
    return labels[type] || type;
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "sent": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  const stats = {
    total: notifications?.length || 0,
    sent: notifications?.filter((n) => n.status === "sent").length || 0,
    failed: notifications?.filter((n) => n.status === "failed").length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Histórico de Notificações
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe todas as notificações enviadas pelo sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enviadas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
            <Mail className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <Mail className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Logs de Entrega
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          {/* Filters */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email, assunto ou empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="billing_generated">Fatura Gerada</SelectItem>
                    <SelectItem value="billing_due_reminder">Lembrete Vencimento</SelectItem>
                    <SelectItem value="contract_completed">Contrato Concluído</SelectItem>
                    <SelectItem value="invite">Convite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>
                Lista de todas as notificações enviadas pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredNotifications && filteredNotifications.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        {isMasterAdmin && <TableHead>Empresa</TableHead>}
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Retries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </div>
                          </TableCell>
                          {isMasterAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {notification.companies?.name || "-"}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="max-w-[200px] truncate">
                            {notification.recipient_email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTypeBadgeVariant(notification.notification_type)}>
                              {getTypeLabel(notification.notification_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {notification.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(notification.status)}>
                              {notification.status === "sent" ? "Enviado" : "Falhou"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {notification.retry_count || 0}/3
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Nenhuma notificação encontrada
                  </h3>
                  <p className="text-muted-foreground">
                    As notificações enviadas pelo sistema aparecerão aqui
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <NotificationDeliveryLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
