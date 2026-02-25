import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Download,
  FileText,
  Pen,
  Send,
  Eye,
  Shield,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAuditActionLabel, getAuditCategoryLabel } from "@/lib/auditLog";

interface AuditLog {
  id: string;
  action: string;
  action_category: string;
  actor_name: string | null;
  actor_email: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

interface ContractVersion {
  id: string;
  version_number: number;
  document_hash: string;
  change_summary: string | null;
  created_at: string;
  created_by: string | null;
}

interface ContractAuditTrailProps {
  contractId: string;
  documentId?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  contract: <FileText className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  signature: <Pen className="h-3.5 w-3.5" />,
  export: <Download className="h-3.5 w-3.5" />,
  general: <Eye className="h-3.5 w-3.5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  contract: "bg-blue-500/10 text-blue-600 border-blue-200",
  document: "bg-purple-500/10 text-purple-600 border-purple-200",
  signature: "bg-green-500/10 text-green-600 border-green-200",
  export: "bg-orange-500/10 text-orange-600 border-orange-200",
  general: "bg-muted text-muted-foreground border-border",
};

export const ContractAuditTrail = ({ contractId, documentId }: ContractAuditTrailProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"logs" | "versions">("logs");

  useEffect(() => {
    fetchData();
  }, [contractId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, versionsRes] = await Promise.all([
        (supabase as any)
          .from("contract_audit_logs")
          .select("*")
          .eq("contract_id", contractId)
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("contract_versions")
          .select("*")
          .eq("contract_id", contractId)
          .order("version_number", { ascending: false }),
      ]);

      setLogs((logsRes.data as AuditLog[]) || []);
      setVersions((versionsRes.data as ContractVersion[]) || []);
    } catch (error) {
      console.error("Error fetching audit data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = categoryFilter === "all"
    ? logs
    : logs.filter(l => l.action_category === categoryFilter);

  const handleExportCSV = () => {
    const headers = ["Data/Hora", "Ação", "Categoria", "Usuário", "Email", "IP", "Detalhes"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      getAuditActionLabel(log.action),
      getAuditCategoryLabel(log.action_category),
      log.actor_name || "-",
      log.actor_email || "-",
      log.ip_address || "-",
      JSON.stringify(log.details || {}),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trilha-auditoria-${contractId.slice(0, 8)}-${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = {
      contractId,
      exportedAt: new Date().toISOString(),
      totalLogs: filteredLogs.length,
      totalVersions: versions.length,
      auditLogs: filteredLogs.map(log => ({
        timestamp: log.created_at,
        action: log.action,
        actionLabel: getAuditActionLabel(log.action),
        category: log.action_category,
        actor: { name: log.actor_name, email: log.actor_email },
        ipAddress: log.ip_address,
        details: log.details,
      })),
      versions: versions.map(v => ({
        versionNumber: v.version_number,
        hash: v.document_hash,
        summary: v.change_summary,
        createdAt: v.created_at,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trilha-auditoria-${contractId.slice(0, 8)}-${format(new Date(), "yyyyMMdd")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeView === "logs" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("logs")}
          >
            <History className="mr-1.5 h-4 w-4" />
            Log de Auditoria ({logs.length})
          </Button>
          <Button
            variant={activeView === "versions" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("versions")}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Versões ({versions.length})
          </Button>
        </div>
        <div className="flex gap-2">
          {activeView === "logs" && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="signature">Assinatura</SelectItem>
                <SelectItem value="export">Exportação</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="mr-1.5 h-4 w-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Audit Logs View */}
      {activeView === "logs" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Trilha de Auditoria
            </CardTitle>
            <CardDescription>
              Registro completo de todas as ações realizadas neste contrato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum registro de auditoria encontrado
              </p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-0">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="relative pl-10 py-3 group">
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 border-background ${
                        log.action_category === "signature" ? "bg-green-500" :
                        log.action_category === "contract" ? "bg-blue-500" :
                        log.action_category === "document" ? "bg-purple-500" :
                        log.action_category === "export" ? "bg-orange-500" :
                        "bg-muted-foreground"
                      }`} />

                      <div
                        className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 shrink-0 ${CATEGORY_COLORS[log.action_category] || ""}`}
                            >
                              {ACTION_ICONS[log.action_category]}
                            </Badge>
                            <span className="text-sm font-medium truncate">
                              {getAuditActionLabel(log.action)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                            {expandedLog === log.id ? (
                              <ChevronUp className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          por {log.actor_name || "Sistema"}
                        </p>

                        {expandedLog === log.id && (
                          <div className="mt-3 p-3 rounded bg-muted/50 space-y-1.5 text-xs">
                            <p><strong>Data/Hora:</strong> {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                            <p><strong>UTC:</strong> {new Date(log.created_at).toISOString()}</p>
                            {log.actor_email && <p><strong>Email:</strong> {log.actor_email}</p>}
                            {log.ip_address && <p><strong>IP:</strong> {log.ip_address}</p>}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <strong>Detalhes:</strong>
                                <pre className="mt-1 p-2 bg-background rounded text-[11px] overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Versions View */}
      {activeView === "versions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Versões
            </CardTitle>
            <CardDescription>
              Todas as versões do documento do contrato com hash de integridade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma versão registrada ainda
              </p>
            ) : (
              <div className="space-y-3">
                {versions.map((version, i) => (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border ${i === 0 ? "border-primary/30 bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={i === 0 ? "default" : "outline"}>
                          v{version.version_number}
                        </Badge>
                        {i === 0 && (
                          <Badge variant="secondary" className="text-[10px]">Atual</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(version.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {version.change_summary && (
                      <p className="text-sm text-foreground mb-2">{version.change_summary}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Hash: {version.document_hash.substring(0, 16)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
