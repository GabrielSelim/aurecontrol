import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPJContracts } from "@/services/pjService";
import { fetchNfseByContract, createNfse, type NfseRecord } from "@/services/nfseService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Search, Eye, FileCheck, FileClock, FilePlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useNavigate } from "react-router-dom";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:      { label: "Vigente",   variant: "default" },
  assinado:    { label: "Assinado",  variant: "default" },
  pending:     { label: "Pendente",  variant: "outline" },
  draft:       { label: "Rascunho",  variant: "secondary" },
  terminated:  { label: "Encerrado", variant: "destructive" },
  expired:     { label: "Expirado",  variant: "secondary" },
};

interface NfseDialogState {
  open: boolean;
  contractId: string;
  companyId: string;
  defaultValor: number;
}

const PJContratos = () => {
  useDocumentTitle("Meus Contratos — Aure");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  // NFS-e state per contract
  const [nfseMap, setNfseMap] = useState<Record<string, NfseRecord[]>>({});
  const [nfseDialog, setNfseDialog] = useState<NfseDialogState>({
    open: false, contractId: "", companyId: "", defaultValor: 0,
  });
  const [nfseValor, setNfseValor] = useState("");
  const [nfseCompetencia, setNfseCompetencia] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM default = current month
  );
  const [isSubmittingNfse, setIsSubmittingNfse] = useState(false);

  useEffect(() => {
    if (user) loadContracts();
  }, [user]);

  const loadContracts = async () => {
    try {
      const data = await fetchPJContracts(user!.id);
      setContracts(data);
      // Batch load NFS-e for all contracts
      const results = await Promise.allSettled(
        data.map((c: any) => fetchNfseByContract(c.id))
      );
      const map: Record<string, NfseRecord[]> = {};
      data.forEach((c: any, i: number) => {
        const r = results[i];
        map[c.id] = r.status === "fulfilled" ? r.value : [];
      });
      setNfseMap(map);
    } catch (err) {
      logger.error("PJContratos load error:", err);
      toast({ title: "Erro ao carregar contratos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openNfseDialog = (c: any) => {
    setNfseValor(c.salary ? String(c.salary) : "");
    setNfseCompetencia(new Date().toISOString().slice(0, 7));
    setNfseDialog({ open: true, contractId: c.id, companyId: c.company_id, defaultValor: c.salary ?? 0 });
  };

  const handleEmitirNfse = async () => {
    const valor = parseFloat(nfseValor.replace(",", "."));
    if (!valor || valor <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    if (!nfseCompetencia) {
      toast({ title: "Informe a competência", variant: "destructive" });
      return;
    }
    setIsSubmittingNfse(true);
    try {
      const created = await createNfse({
        contractId: nfseDialog.contractId,
        companyId: nfseDialog.companyId,
        valor,
        competencia: nfseCompetencia,
      });
      setNfseMap((prev) => ({
        ...prev,
        [nfseDialog.contractId]: [created, ...(prev[nfseDialog.contractId] ?? [])],
      }));
      toast({ title: "NFS-e registrada com status pendente. A emissão será processada em breve." });
      setNfseDialog((d) => ({ ...d, open: false }));
    } catch (err) {
      logger.error("Emitir NFS-e error:", err);
      toast({ title: "Erro ao registrar NFS-e", variant: "destructive" });
    } finally {
      setIsSubmittingNfse(false);
    }
  };

  const filtered = contracts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.job_title?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Contratos</h1>
        <p className="text-muted-foreground">Todos os contratos associados à sua conta</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cargo ou status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table/Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {search ? "Nenhum contrato encontrado para esta busca" : "Você ainda não possui contratos"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const s = statusMap[c.status] ?? { label: c.status, variant: "secondary" as const };
            const nfseList = nfseMap[c.id] ?? [];
            const emitidas = nfseList.filter((n) => n.status === "emitida").length;
            const pendentes = nfseList.filter((n) => n.status === "pendente").length;
            const isPJ = c.contract_type === "pj";
            const canEmitNfse = isPJ && (c.status === "active" || c.status === "assinado");
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-medium">{c.job_title || "Contrato"}</p>
                        <Badge variant={s.variant}>{s.label}</Badge>
                        {isPJ && (
                          <Badge variant="secondary" className="text-xs">PJ</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground ml-6">
                        {c.start_date && (
                          <span>Início: {format(new Date(c.start_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                        {c.end_date && (
                          <span>Término: {format(new Date(c.end_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                        {c.salary && (
                          <span>
                            Valor:{" "}
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.salary)}
                            /mês
                          </span>
                        )}
                      </div>
                      {/* NFS-e summary */}
                      {isPJ && (
                        <div className="flex items-center gap-3 ml-6 mt-1">
                          {emitidas > 0 && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <FileCheck className="h-3.5 w-3.5" />
                              {emitidas} NFS-e emitida{emitidas !== 1 ? "s" : ""}
                            </span>
                          )}
                          {pendentes > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <FileClock className="h-3.5 w-3.5" />
                              {pendentes} pendente{pendentes !== 1 ? "s" : ""}
                            </span>
                          )}
                          {nfseList.length === 0 && (
                            <span className="text-xs text-muted-foreground">Nenhuma NFS-e registrada</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {canEmitNfse && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-violet-700 border-violet-300 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-700 dark:hover:bg-violet-950"
                          onClick={() => openNfseDialog(c)}
                        >
                          <FilePlus className="h-4 w-4 mr-1" /> Emitir NFS-e
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/pj/contratos/${c.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} contrato{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* NFS-e Emission Dialog */}
      <Dialog
        open={nfseDialog.open}
        onOpenChange={(open) => setNfseDialog((d) => ({ ...d, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir NFS-e</DialogTitle>
            <DialogDescription>
              Registre uma Nota Fiscal de Serviço Eletrônica para este contrato.
              A emissão será processada automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nfse-valor">Valor do serviço (R$)</Label>
              <Input
                id="nfse-valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 5000.00"
                value={nfseValor}
                onChange={(e) => setNfseValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nfse-competencia">Competência</Label>
              <Input
                id="nfse-competencia"
                type="month"
                value={nfseCompetencia}
                onChange={(e) => setNfseCompetencia(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Mês de referência da prestação de serviço</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNfseDialog((d) => ({ ...d, open: false }))}
              disabled={isSubmittingNfse}
            >
              Cancelar
            </Button>
            <Button onClick={handleEmitirNfse} disabled={isSubmittingNfse}>
              <FilePlus className="h-4 w-4 mr-2" />
              {isSubmittingNfse ? "Registrando..." : "Registrar NFS-e"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PJContratos;
