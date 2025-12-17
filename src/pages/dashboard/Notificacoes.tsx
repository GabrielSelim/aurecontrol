import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, Search, Filter, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationLog {
  id: string;
  company_id: string | null;
  recipient_email: string;
  notification_type: string;
  subject: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  companies?: {
    name: string;
  } | null;
}

export default function Notificacoes() {
  const { hasRole } = useAuth();
  const isMasterAdmin = hasRole("master_admin");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notification-logs", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("notification_logs")
        .select(`
          *,
          companies:company_id (name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (typeFilter !== "all") {
        query = query.eq("notification_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  const filteredNotifications = notifications?.filter((notification) => {
    const matchesSearch =
      notification.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "billing_generated":
        return "default";
      case "billing_due_reminder":
        return "secondary";
      case "invite":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "billing_generated":
        return "Fatura Gerada";
      case "billing_due_reminder":
        return "Lembrete Vencimento";
      case "invite":
        return "Convite";
      default:
        return type;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "sent":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const stats = {
    total: notifications?.length || 0,
    sent: notifications?.filter((n) => n.status === "sent").length || 0,
    failed: notifications?.filter((n) => n.status === "failed").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters */}
      <Card>
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
                <SelectItem value="invite">Convite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
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
    </div>
  );
}
