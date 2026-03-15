import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchNfseByContract, type NfseRecord } from "@/services/nfseService";
import { fetchPJContracts } from "@/services/pjService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Search, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface NfseWithContract extends NfseRecord {
  contract_job_title?: string;
}

const STATUS_CONFIG = {
  pendente:  { label: "Pendente",  variant: "outline" as const,      icon: Clock,         color: "text-amber-600" },
  emitida:   { label: "Emitida",   variant: "default" as const,      icon: CheckCircle,   color: "text-green-600" },
  cancelada: { label: "Cancelada", variant: "secondary" as const,    icon: XCircle,       color: "text-gray-500" },
  erro:      { label: "Erro",      variant: "destructive" as const,  icon: AlertCircle,   color: "text-red-600" },
};

const PJNotasFiscais = () => {
  useDocumentTitle("Notas Fiscais — Aure");
  const { user } = useAuth();
  const { toast } = useToast();

  const [nfseList, setNfseList] = useState<NfseWithContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (user) loadNfse();
  }, [user]);

  const loadNfse = async () => {
    try {
      const contracts = await fetchPJContracts(user!.id);
      const results = await Promise.allSettled(
        contracts.map((c: any) => fetchNfseByContract(c.id).then(notes =>
          notes.map(n => ({ ...n, contract_job_title: c.job_title }))
        ))
      );
      const all: NfseWithContract[] = [];
      results.forEach(r => {
        if (r.status === "fulfilled") all.push(...r.value);
      });
      // Sort by competencia descending
      all.sort((a, b) => b.competencia.localeCompare(a.competencia));
      setNfseList(all);
    } catch (err) {
      logger.error("PJNotasFiscais load:", err);
      toast({ title: "Erro ao carregar notas fiscais", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return nfseList.filter(n => {
      const matchSearch =
        !search ||
        (n.numero?.includes(search) ?? false) ||
        (n.contract_job_title?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        n.competencia.includes(search);
      const matchStatus = statusFilter === "all" || n.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [nfseList, search, statusFilter]);

  const totals = useMemo(() => ({
    total: nfseList.length,
    emitida: nfseList.filter(n => n.status === "emitida").length,
    pendente: nfseList.filter(n => n.status === "pendente").length,
    valorTotal: nfseList.filter(n => n.status === "emitida").reduce((s, n) => s + n.valor, 0),
  }), [nfseList]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleDownloadPDF = async (nfse: NfseWithContract) => {
    if (nfse.pdf_url) {
      window.open(nfse.pdf_url, "_blank");
      return;
    }
    toast({ title: "PDF não disponível", description: "A nota ainda não tem PDF gerado pela prefeitura.", variant: "destructive" });
  };

  const handleDownloadXML = (nfse: NfseWithContract) => {
    if (!nfse.xml) {
      toast({ title: "XML não disponível", variant: "destructive" });
      return;
    }
    const blob = new Blob([nfse.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfse_${nfse.numero || nfse.id.slice(0, 8)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Notas Fiscais</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Histórico completo de NFS-e emitidas e pendentes.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{totals.total}</p>
            <p className="text-xs text-muted-foreground">Total de notas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-green-600">{totals.emitida}</p>
            <p className="text-xs text-muted-foreground">Emitidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-amber-600">{totals.pendente}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.valorTotal)}</p>
            <p className="text-xs text-muted-foreground">Total emitido</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, contrato ou competência..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-lg font-semibold">{nfseList.length === 0 ? "Nenhuma nota fiscal" : "Nenhum resultado"}</p>
              <p className="text-sm text-muted-foreground">
                {nfseList.length === 0
                  ? "Emita sua primeira NFS-e pela tela de Contratos."
                  : "Tente ajustar os filtros."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº da Nota</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emitida em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(nfse => {
                  const cfg = STATUS_CONFIG[nfse.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={nfse.id}>
                      <TableCell className="font-mono text-xs">
                        {nfse.numero || <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{nfse.contract_job_title || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(nfse.competencia + "-01"), "MMM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(nfse.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {nfse.emitida_em
                          ? format(new Date(nfse.emitida_em), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {nfse.pdf_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(nfse)}
                              title="Baixar PDF"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          )}
                          {nfse.xml && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadXML(nfse)}
                              title="Baixar XML"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              XML
                            </Button>
                          )}
                          {!nfse.pdf_url && !nfse.xml && (
                            <span className="text-xs text-muted-foreground px-2">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PJNotasFiscais;
