import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTemplateById, updateTemplate } from "@/services/contractService";
import { RichTextEditor, RichTextEditorHandle } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, CheckCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// ── Variable groups (same as TemplatesContrato) ──────────────────────
const VARIABLE_GROUPS = [
  {
    label: "Empresa Contratante",
    icon: "🏢",
    variables: [
      { key: "{{contratante_razao_social}}", description: "Razão social da empresa" },
      { key: "{{contratante_cnpj}}", description: "CNPJ da empresa" },
      { key: "{{contratante_endereco}}", description: "Endereço da empresa" },
    ],
  },
  {
    label: "Representante Legal",
    icon: "👤",
    variables: [
      { key: "{{representante_nome}}", description: "Nome do representante" },
      { key: "{{representante_cpf}}", description: "CPF do representante" },
      { key: "{{representante_nacionalidade}}", description: "Nacionalidade" },
      { key: "{{representante_estado_civil}}", description: "Estado civil" },
      { key: "{{representante_data_nascimento}}", description: "Data de nascimento" },
      { key: "{{representante_profissao}}", description: "Profissão" },
      { key: "{{representante_rg}}", description: "RG" },
      { key: "{{representante_orgao_expedidor}}", description: "Órgão expedidor do RG" },
      { key: "{{representante_endereco}}", description: "Endereço do representante" },
    ],
  },
  {
    label: "Contratado (PJ)",
    icon: "📋",
    variables: [
      { key: "{{contratado_nome}}", description: "Razão social do contratado" },
      { key: "{{contratado_nome_fantasia}}", description: "Nome fantasia" },
      { key: "{{contratado_cpf_cnpj}}", description: "CNPJ do contratado" },
      { key: "{{contratado_endereco}}", description: "Endereço do contratado" },
    ],
  },
  {
    label: "Dados do Contrato",
    icon: "📄",
    variables: [
      { key: "{{cargo}}", description: "Cargo / função" },
      { key: "{{departamento}}", description: "Departamento" },
      { key: "{{valor}}", description: "Valor do contrato" },
      { key: "{{data_inicio}}", description: "Data de início" },
      { key: "{{data_fim}}", description: "Data de término" },
      { key: "{{data_atual}}", description: "Data atual por extenso" },
      { key: "{{cidade}}", description: "Cidade de assinatura" },
    ],
  },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

const TemplateEditorFullscreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useDocumentTitle("Editor de Template");

  const editorRef = useRef<RichTextEditorHandle>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true });

  // Load template
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchTemplateById(id)
      .then((t) => {
        setName(t.name);
        setDescription(t.description ?? "");
        setContent(t.content);
      })
      .catch(() => {
        toast.error("Erro ao carregar o template.");
        navigate("/dashboard/templates-contrato");
      })
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) {
      toast.error("O nome do template é obrigatório.");
      return;
    }
    setSaveStatus("saving");
    try {
      await updateTemplate(id, { name: name.trim(), description: description || null, content });
      setSaveStatus("saved");
      toast.success("Template salvo com sucesso!");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      toast.error("Erro ao salvar o template.");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [id, name, description, content]);

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const toggleGroup = (index: number) =>
    setOpenGroups((prev) => ({ ...prev, [index]: !prev[index] }));

  const insertVariable = (variable: string) => {
    editorRef.current?.insertVariable(variable);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-7 w-64" />
          <div className="ml-auto">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="flex flex-1 gap-0 overflow-hidden">
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[calc(100vh-220px)] w-full" />
          </div>
          <div className="w-64 border-l p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2 border-b bg-background/95 backdrop-blur-sm z-10 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/templates-contrato")}
          aria-label="Voltar para templates"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Templates de Contrato</p>
          <h1 className="text-base font-semibold truncate">{name || "Sem título"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Salvo
            </span>
          )}
          <Button onClick={handleSave} disabled={saveStatus === "saving"} size="sm">
            <Save className="mr-2 h-4 w-4" />
            Salvar <span className="ml-1 text-xs opacity-60 hidden sm:inline">(Ctrl+S)</span>
          </Button>
        </div>
      </header>

      {/* Body: editor + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <main className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="tpl-name">Nome do template <span className="text-destructive">*</span></Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Contrato de Prestação de Serviços PJ"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl-desc">Descrição</Label>
              <Input
                id="tpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição breve do template"
              />
            </div>
          </div>
          <div className="flex-1">
            <RichTextEditor
              ref={editorRef}
              content={content}
              onChange={setContent}
              placeholder="Comece a escrever o conteúdo do contrato..."
              className="min-h-[500px]"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Use <kbd className="border rounded px-1 py-0.5 text-xs font-mono bg-muted">Ctrl+S</kbd> para salvar
          </p>
        </main>

        {/* Variables sidebar */}
        <aside className="w-72 border-l flex-shrink-0 flex flex-col bg-muted/20">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">Variáveis Dinâmicas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Clique para inserir no cursor</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {VARIABLE_GROUPS.map((group, gi) => (
                <div key={gi} className="rounded-md border bg-background overflow-hidden">
                  <button
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroup(gi)}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{group.icon}</span>
                      {group.label}
                    </span>
                    {openGroups[gi] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {openGroups[gi] && (
                    <>
                      <Separator />
                      <div className="p-1.5 space-y-1">
                        {group.variables.map((v) => (
                          <button
                            key={v.key}
                            className="w-full text-left rounded px-2 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors group"
                            onClick={() => insertVariable(v.key)}
                            title={v.description}
                          >
                            <span className="block text-xs font-mono text-primary/80 group-hover:text-primary truncate">
                              {v.key}
                            </span>
                            <span className="block text-[10px] text-muted-foreground truncate">
                              {v.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="px-3 pb-4">
              <div className="rounded-md border bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">💡 Dica</p>
                <p>Posicione o cursor no editor e clique em uma variável para inseri-la. Os valores reais serão substituídos ao gerar o contrato.</p>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
};

export default TemplateEditorFullscreen;
