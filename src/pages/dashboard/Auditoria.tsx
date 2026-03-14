import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auditLogsTable } from "@/integrations/supabase/extraTypes";
import { getAuditActionLabel, getAuditCategoryLabel } from "@/lib/auditLog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Search, ShieldCheck, Hash } from "lucide-react";

interface AuditLogEntry {
  id: string;
  contract_id: string;
  action: string;
  action_category: string;
  actor_name: string;
  actor_email: string;
  ip_address: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const CATEGORY_BADGE: Record<string, string> = {
  contract: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  document: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  signature: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  export: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

/** Compute SHA-256 integrity hash for an audit log entry. */
async function computeIntegrityHash(log: AuditLogEntry): Promise<string> {
  const payload = `${log.id}|${log.action}|${log.actor_email}|${log.contract_id}|${log.created_at}|${JSON.stringify(log.details)}`;
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const Auditoria = () => {
  useDocumentTitle("Auditoria");
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [integrityHashes, setIntegrityHashes] = useState<Record<string, string>>({});

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (hasRole("master_admin")) {
      fetchLogs();
    }
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (auditLogsTable() as ReturnType<typeof auditLogsTable>)
        .select("id, contract_id, action, action_category, actor_name, actor_email, ip_address, details, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      const entries = (data as AuditLogEntry[]) ?? [];
      setLogs(entries);
      // Compute integrity hashes (Web Crypto API — runs off the main thread)
      const hashEntries = await Promise.all(
        entries.map(async (log) => [log.id, await computeIntegrityHash(log)] as const)
      );
      setIntegrityHashes(Object.fromEntries(hashEntries));
    } catch (err) {
      logger.error("fetchLogs error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !search ||
        log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
        log.actor_email.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.contract_id.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || log.action_category === categoryFilter;

      const logDate = new Date(log.created_at);
      const matchesFrom = !dateFrom || logDate >= new Date(dateFrom);
      const matchesTo = !dateTo || logDate <= new Date(`${dateTo}T23:59:59`);

      return matchesSearch && matchesCategory && matchesFrom && matchesTo;
    });
  }, [logs, search, categoryFilter, dateFrom, dateTo]);

  const exportToCSV = () => {
    const headers = ["Data/Hora", "Ação", "Categoria", "Usuário", "Email", "Contrato", "IP", "Hash SHA-256"];
    const rows = filtered.map((log) => [
      new Date(log.created_at).toLocaleString("pt-BR"),
      getAuditActionLabel(log.action),
      getAuditCategoryLabel(log.action_category),
      log.actor_name,
      log.actor_email,
      log.contract_id,
      log.ip_address ?? "",
      integrityHashes[log.id] ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasRole("master_admin")) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Acesso restrito a administradores master.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Auditoria Central</h1>
            <p className="text-sm text-muted-foreground">
              Histórico completo de ações no sistema
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Usuário, ação, contrato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="signature">Assinatura</SelectItem>
                <SelectItem value="export">Exportação</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="De"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Até"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        {isLoading ? "Carregando..." : `${filtered.length} registro(s) encontrado(s)`}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum registro de auditoria encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" /> Hash
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {getAuditActionLabel(log.action)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[log.action_category] ?? CATEGORY_BADGE.general}`}>
                        {getAuditCategoryLabel(log.action_category)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium leading-none">{log.actor_name}</p>
                        <p className="text-xs text-muted-foreground">{log.actor_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                      {log.contract_id.split("-")[0]}…
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.ip_address ?? "—"}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <code className="font-mono text-xs text-muted-foreground cursor-default select-all">
                              {integrityHashes[log.id]
                                ? `${integrityHashes[log.id].slice(0, 8)}…`
                                : "—"}
                            </code>
                          </TooltipTrigger>
                          {integrityHashes[log.id] && (
                            <TooltipContent side="left" className="max-w-xs break-all font-mono text-xs">
                              {integrityHashes[log.id]}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auditoria;
