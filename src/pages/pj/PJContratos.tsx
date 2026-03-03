import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPJContracts } from "@/services/pjService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, Eye, Download } from "lucide-react";
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

const PJContratos = () => {
  useDocumentTitle("Meus Contratos — Aure");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadContracts();
  }, [user]);

  const loadContracts = async () => {
    try {
      const data = await fetchPJContracts(user!.id);
      setContracts(data);
    } catch (err) {
      logger.error("PJContratos load error:", err);
      toast({ title: "Erro ao carregar contratos", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-medium">{c.job_title || "Contrato"}</p>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground ml-6">
                        {c.start_date && (
                          <span>Início: {format(new Date(c.start_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                        {c.end_date && (
                          <span>Término: {format(new Date(c.end_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                        {c.monthly_value && (
                          <span>
                            Valor:{" "}
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.monthly_value)}
                            /mês
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/contratos/${c.id}`)}
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
    </div>
  );
};

export default PJContratos;
