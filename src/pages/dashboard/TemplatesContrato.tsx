import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  updateTemplate,
  fetchActiveTemplates,
  fetchTemplateUsageCounts,
  fetchTemplateVersions,
  getLatestVersionNumber,
  createTemplateVersion,
  createTemplate,
  duplicateTemplate,
  softDeleteTemplate,
} from "@/services/contractService";
// mammoth is dynamically imported in handleDocxImport to reduce initial bundle size
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor, RichTextEditorHandle } from "@/components/RichTextEditor";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  Eye,
  Copy,
  Info,
  ChevronUp,
  Users2,
  Search,
  Save,
  Scale,
  Shield,
  Lightbulb,
  XCircle,
  History,
  RotateCcw,
  FileUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/handleApiError";
import { sanitizeHtml } from "@/lib/sanitize";

interface Template {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  content: string;
  is_system_default: boolean;
  is_active: boolean;
  default_witness_count: number;
  created_at: string;
  category: string | null;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  name: string;
  description: string | null;
  content: string;
  saved_by: string | null;
  created_at: string;
}

const TEMPLATE_CATEGORIES = [
  { value: "pj", label: "PJ Prestação de Serviços", icon: "💼" },
  { value: "clt", label: "CLT", icon: "📋" },
  { value: "nda", label: "NDA / Confidencialidade", icon: "🔒" },
  { value: "parceria", label: "Parceria", icon: "🤝" },
  { value: "aditivo", label: "Aditivo Contratual", icon: "📝" },
  { value: "outro", label: "Outro", icon: "📄" },
] as const;

const TEMPLATE_VARIABLE_GROUPS = [
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
      { key: "{{representante_endereco}}", description: "Endereço" },
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
      { key: "{{cargo}}", description: "Cargo/função" },
      { key: "{{departamento}}", description: "Departamento" },
      { key: "{{valor}}", description: "Valor do contrato" },
      { key: "{{data_inicio}}", description: "Data de início" },
      { key: "{{data_fim}}", description: "Data de término" },
      { key: "{{data_atual}}", description: "Data atual por extenso" },
      { key: "{{cidade}}", description: "Cidade de assinatura" },
    ],
  },
];

const STANDARD_CLAUSES = [
  {
    label: "Confidencialidade",
    icon: Shield,
    content: `<h3>CLÁUSULA — CONFIDENCIALIDADE</h3><p>A CONTRATADA compromete-se a manter em absoluto sigilo todas as informações confidenciais obtidas em razão da execução deste contrato, incluindo, mas não se limitando a dados comerciais, técnicos, financeiros, estratégicos e de propriedade intelectual da CONTRATANTE.</p><p>Esta obrigação permanece válida mesmo após o término do presente contrato, pelo prazo de 2 (dois) anos.</p>`,
  },
  {
    label: "Rescisão",
    icon: Scale,
    content: `<h3>CLÁUSULA — RESCISÃO</h3><p>O presente contrato poderá ser rescindido por qualquer das partes, mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias.</p><p>Em caso de descumprimento de quaisquer cláusulas contratuais, a parte prejudicada poderá rescindir imediatamente o contrato, sem prejuízo de indenização por perdas e danos.</p><p>Na hipótese de rescisão sem justa causa pela CONTRATANTE, ficará assegurado à CONTRATADA o recebimento pelos serviços já executados até a data da rescisão.</p>`,
  },
  {
    label: "Propriedade Intelectual",
    icon: Lightbulb,
    content: `<h3>CLÁUSULA — PROPRIEDADE INTELECTUAL</h3><p>Todos os materiais, documentos, criações intelectuais, softwares, códigos-fonte, metodologias e demais entregáveis produzidos pela CONTRATADA em decorrência deste contrato serão de propriedade exclusiva da CONTRATANTE.</p><p>A CONTRATADA cede todos os direitos patrimoniais de autor e propriedade intelectual sobre os entregáveis, de forma irrevogável e irretratável.</p>`,
  },
  {
    label: "Foro e Jurisdição",
    icon: Scale,
    content: `<h3>CLÁUSULA — FORO</h3><p>Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de {{cidade}}, com exclusão de qualquer outro, por mais privilegiado que seja.</p><p>E, por estarem assim justas e contratadas, as partes firmam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença de testemunhas abaixo.</p>`,
  },
];

const TemplatesContrato = () => {
  useDocumentTitle("Templates de Contrato");
  const { profile, isAdmin, hasRole } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateUsageCounts, setTemplateUsageCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const editorRef = useRef<RichTextEditorHandle>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [witnessCount, setWitnessCount] = useState("2");
  const [category, setCategory] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Version history state
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isImportingDocx, setIsImportingDocx] = useState(false);

  const isMasterAdmin = hasRole("master_admin");
  const canManageTemplates = isAdmin() || hasRole("juridico") || isMasterAdmin;

  const filteredTemplates = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return templates;
    const term = debouncedSearchTerm.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
    );
  }, [templates, debouncedSearchTerm]);

  const isNewTemplate = (createdAt: string) => {
    return differenceInDays(new Date(), new Date(createdAt)) <= 30;
  };

  // Auto-save for editing existing templates
  const performAutoSave = useCallback(async () => {
    if (!editingTemplate || !name || !content || content === lastSavedContentRef.current) return;
    setAutoSaveStatus("saving");
    try {
      await updateTemplate(editingTemplate.id, {
          name,
          description: description || null,
          content,
          default_witness_count: parseInt(witnessCount),
          category: category || null,
        });
      lastSavedContentRef.current = content;
      // Save version snapshot on auto-save
      await saveVersionSnapshot(editingTemplate.id, name, description || null, content);
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [editingTemplate, name, description, content, witnessCount, category]);

  useEffect(() => {
    if (isDialogOpen && editingTemplate) {
      autoSaveTimerRef.current = setInterval(performAutoSave, 30000);
      return () => {
        if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      };
    } else {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      setAutoSaveStatus("idle");
    }
  }, [isDialogOpen, editingTemplate, performAutoSave]);

  useEffect(() => {
    fetchTemplates();
    fetchTemplateUsage();
  }, [profile?.company_id]);

  const fetchTemplates = async () => {
    setLoadError(false);
    setIsLoading(true);
    try {
      const data = await fetchActiveTemplates();
      setTemplates(data as Template[]);
    } catch (error) {
      logger.error("Error fetching templates:", error);
      toast.error("Erro ao carregar templates");
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateUsage = async () => {
    try {
      const data = await fetchTemplateUsageCounts();

      const counts: Record<string, number> = {};
      data.forEach((doc) => {
        if (doc.template_id) {
          counts[doc.template_id] = (counts[doc.template_id] || 0) + 1;
        }
      });
      setTemplateUsageCounts(counts);
    } catch (error) {
      logger.error("Error fetching template usage:", error);
    }
  };

  const fetchVersions = async (templateId: string) => {
    setIsLoadingVersions(true);
    try {
      const data = await fetchTemplateVersions(templateId);
      setVersions(data as TemplateVersion[]);
    } catch (error) {
      logger.error("Error fetching versions:", error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const saveVersionSnapshot = async (templateId: string, templateName: string, templateDescription: string | null, templateContent: string) => {
    try {
      // Get next version number
      const latestVersion = await getLatestVersionNumber(templateId);
      const nextVersion = latestVersion + 1;

      await createTemplateVersion({
          template_id: templateId,
          version_number: nextVersion,
          name: templateName,
          description: templateDescription || null,
          content: templateContent,
          saved_by: profile?.user_id || null,
        });
    } catch (error) {
      logger.error("Error saving version snapshot:", error);
    }
  };

  const handleRestoreVersion = (version: TemplateVersion) => {
    setName(version.name);
    setContent(version.content);
    if (version.description) setDescription(version.description);
    toast.success(`Versão ${version.version_number} restaurada no editor. Salve para confirmar.`);
  };

  const handleCreateOrUpdateTemplate = async () => {
    if (!name || !content) {
      toast.error("Preencha o nome e conteúdo do template");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingTemplate) {
        // Update existing template
        await updateTemplate(editingTemplate.id, {
            name,
            description: description || null,
            content,
            default_witness_count: parseInt(witnessCount),
            category: category || null,
          });
        // Save version snapshot on manual save
        await saveVersionSnapshot(editingTemplate.id, name, description || null, content);
        toast.success("Template atualizado com sucesso!");
      } else {
        // Create new template
        await createTemplate({
          company_id: isMasterAdmin ? null : profile?.company_id ?? null,
          name,
          description: description || null,
          content,
          default_witness_count: parseInt(witnessCount),
          is_system_default: isMasterAdmin && !profile?.company_id,
          created_by: profile?.user_id ?? null,
          category: category || null,
        });
        toast.success("Template criado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao salvar template"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = useCallback((template: Template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || "");
    setContent(template.content);
    setWitnessCount(template.default_witness_count.toString());
    setCategory(template.category || "");
    lastSavedContentRef.current = template.content;
    setIsDialogOpen(true);
    fetchVersions(template.id);
  }, [fetchVersions]);

  const handleDuplicateTemplate = useCallback(async (template: Template) => {
    try {
      await duplicateTemplate({
        company_id: profile?.company_id ?? null,
        name: `${template.name} (Cópia)`,
        description: template.description,
        content: template.content,
        default_witness_count: template.default_witness_count,
        category: template.category,
        created_by: profile?.user_id ?? null,
      });
      toast.success("Template duplicado com sucesso!");
      fetchTemplates();
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao duplicar template"));
    }
  }, [profile?.company_id, profile?.user_id, fetchTemplates]);

  const handleDeleteTemplate = useCallback(async (template: Template) => {
    if (template.is_system_default && !isMasterAdmin) {
      toast.error("Não é possível excluir templates do sistema");
      return;
    }

    try {
      await softDeleteTemplate(template.id);
      toast.success("Template excluído com sucesso!");
      fetchTemplates();
    } catch (error) {
      toast.error(handleApiError(error, "Erro ao excluir template"));
    }
  }, [isMasterAdmin, fetchTemplates]);

  const resetForm = () => {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setContent("");
    setWitnessCount("2");
    setCategory("");
    setVersions([]);
  };

  const handleDocxImport = async (file: File) => {
    setIsImportingDocx(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.convertToHtml({ arrayBuffer });
      if (result.value) {
        setContent(result.value);
        toast.success("Documento importado com sucesso!");
        if (result.messages.length > 0) {
          const warnings = result.messages.filter(m => m.type === "warning");
          if (warnings.length > 0) {
            toast.info(`${warnings.length} aviso(s) de formatação — revise o conteúdo`);
          }
        }
      } else {
        toast.error("Arquivo vazio ou sem conteúdo legível");
      }
    } catch (error) {
      logger.error("Error importing docx:", error);
      toast.error("Erro ao importar documento .docx");
    } finally {
      setIsImportingDocx(false);
    }
  };

  const getCategoryLabel = (cat: string | null) => {
    if (!cat) return null;
    return TEMPLATE_CATEGORIES.find(c => c.value === cat);
  };

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertVariable(variable);
    } else {
      setContent((prev) => prev + variable);
    }
  };

  const toggleInlinePreview = useCallback((templateId: string) => {
    setExpandedTemplateId(prev => prev === templateId ? null : templateId);
  }, []);

  const renderPreviewHtml = (html: string) => {
    return html
      .replace(/\{\{contratante_razao_social\}\}/g, "Empresa Exemplo LTDA")
      .replace(/\{\{contratante_cnpj\}\}/g, "12.345.678/0001-90")
      .replace(/\{\{contratante_endereco\}\}/g, "Rua Exemplo, 123, Centro")
      .replace(/\{\{representante_nome\}\}/g, "João da Silva")
      .replace(/\{\{representante_cpf\}\}/g, "123.456.789-00")
      .replace(/\{\{representante_nacionalidade\}\}/g, "Brasileiro")
      .replace(/\{\{representante_estado_civil\}\}/g, "Casado")
      .replace(/\{\{representante_profissao\}\}/g, "Empresário")
      .replace(/\{\{representante_rg\}\}/g, "12.345.678-9")
      .replace(/\{\{representante_orgao_expedidor\}\}/g, "SSP/SP")
      .replace(/\{\{representante_endereco\}\}/g, "Rua Exemplo, 123")
      .replace(/\{\{representante_data_nascimento\}\}/g, "01/01/1980")
      .replace(/\{\{contratado_nome\}\}/g, "MS Consultoria LTDA")
      .replace(/\{\{contratado_nome_fantasia\}\}/g, "MS Consultoria")
      .replace(/\{\{contratado_cpf_cnpj\}\}/g, "98.765.432/0001-10")
      .replace(/\{\{contratado_endereco\}\}/g, "Av. Teste, 456, Bairro")
      .replace(/\{\{cargo\}\}/g, "Desenvolvedor Full Stack")
      .replace(/\{\{departamento\}\}/g, "Tecnologia")
      .replace(/\{\{valor\}\}/g, "R$ 15.000,00")
      .replace(/\{\{data_inicio\}\}/g, "01/01/2026")
      .replace(/\{\{data_fim\}\}/g, "31/12/2026")
      .replace(/\{\{data_atual\}\}/g, format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
      .replace(/\{\{cidade\}\}/g, "São Paulo")
      // Legacy English variables fallback
      .replace(/\{\{company_name\}\}/g, "Empresa Exemplo LTDA")
      .replace(/\{\{company_cnpj\}\}/g, "12.345.678/0001-90")
      .replace(/\{\{company_address\}\}/g, "Rua Exemplo, 123, Centro")
      .replace(/\{\{company_city\}\}/g, "São Paulo")
      .replace(/\{\{company_representative_name\}\}/g, "João da Silva")
      .replace(/\{\{contractor_name\}\}/g, "Maria Santos")
      .replace(/\{\{contractor_cpf\}\}/g, "123.456.789-00")
      .replace(/\{\{contractor_company_name\}\}/g, "MS Consultoria LTDA")
      .replace(/\{\{contractor_cnpj\}\}/g, "98.765.432/0001-10")
      .replace(/\{\{contractor_address\}\}/g, "Av. Teste, 456, Bairro")
      .replace(/\{\{job_title\}\}/g, "Desenvolvedor Full Stack")
      .replace(/\{\{salary\}\}/g, "R$ 15.000,00")
      .replace(/\{\{start_date\}\}/g, "01/01/2026")
      .replace(/\{\{end_date\}\}/g, "31/12/2026")
      .replace(/\{\{current_date\}\}/g, format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
      .replace(/\{\{city\}\}/g, "São Paulo");
  };

  const renderTemplateTable = (templateList: Template[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead className="hidden md:table-cell">Categoria</TableHead>
          <TableHead className="hidden md:table-cell">Uso</TableHead>
          <TableHead className="hidden md:table-cell">Testemunhas</TableHead>
          <TableHead className="hidden md:table-cell">Criado em</TableHead>
          <TableHead className="w-[140px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templateList.map((template) => (
          <React.Fragment key={template.id}>
            <TableRow>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium">{template.name}</p>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                  </div>
                  {isNewTemplate(template.created_at) && (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-1.5 py-0">
                      Novo
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {(() => {
                  const cat = getCategoryLabel(template.category);
                  return cat ? (
                    <Badge variant="outline" className="text-xs">
                      {cat.icon} {cat.label}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  );
                })()}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-default">
                      <FileText className="h-3 w-3 mr-1" />
                      {templateUsageCounts[template.id] || 0}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Usado em {templateUsageCounts[template.id] || 0} contrato(s)
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-1">
                  <Users2 className="h-3 w-3 text-muted-foreground" />
                  {template.default_witness_count}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleInlinePreview(template.id)}
                        className="h-8 w-8"
                        aria-label={expandedTemplateId === template.id ? "Fechar prévia" : "Prévia rápida"}
                      >
                        {expandedTemplateId === template.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {expandedTemplateId === template.id ? "Fechar prévia" : "Prévia rápida"}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewContent(template.content)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Tela cheia
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      {(!template.is_system_default || isMasterAdmin) && (
                        <>
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
            {expandedTemplateId === template.id && (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <div className="border-t bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Prévia com dados de exemplo:</p>
                    <div
                      className="prose prose-sm max-w-none p-4 border rounded-lg bg-white text-black max-h-[300px] overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(renderPreviewHtml(template.content)),
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );

  if (!canManageTemplates) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para gerenciar templates de contrato.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Templates de Contrato</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os modelos de contrato PJ da empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Template" : "Criar Novo Template"}
              </DialogTitle>
              <DialogDescription>
                Crie um modelo de contrato PJ com variáveis dinâmicas
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="editor" className="mt-4">
              <TabsList className={editingTemplate ? "grid w-full grid-cols-5" : "grid w-full grid-cols-4"}>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="variables">Variáveis</TabsTrigger>
                <TabsTrigger value="clauses">Cláusulas</TabsTrigger>
                <TabsTrigger value="preview">Prévia</TabsTrigger>
                {editingTemplate && (
                  <TabsTrigger value="history" className="gap-1">
                    <History className="h-3.5 w-3.5" />
                    Histórico
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="editor" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Template *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Contrato de Desenvolvimento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="witnessCount">Testemunhas Padrão</Label>
                    <Select value={witnessCount} onValueChange={setWitnessCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sem testemunhas</SelectItem>
                        <SelectItem value="1">1 testemunha</SelectItem>
                        <SelectItem value="2">2 testemunhas</SelectItem>
                        <SelectItem value="3">3 testemunhas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição breve do template"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Conteúdo do Contrato *</Label>
                    <div className="flex items-center gap-2">
                      {isImportingDocx && (
                        <span className="text-xs text-muted-foreground animate-pulse">Importando...</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        disabled={isImportingDocx}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".docx";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleDocxImport(file);
                          };
                          input.click();
                        }}
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        Importar .docx
                      </Button>
                    </div>
                  </div>
                  <RichTextEditor
                    ref={editorRef}
                    content={content}
                    onChange={setContent}
                    placeholder="Comece a escrever o conteúdo do contrato..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="variables" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variáveis Disponíveis</CardTitle>
                    <CardDescription>
                      Clique em uma variável para inseri-la na posição do cursor no editor
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {TEMPLATE_VARIABLE_GROUPS.map((group) => (
                      <div key={group.label}>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <span>{group.icon}</span>
                          {group.label}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {group.variables.map((variable) => (
                            <div
                              key={variable.key}
                              className="flex items-center justify-between p-2 border rounded-md hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-colors group"
                              onClick={() => insertVariable(variable.key)}
                            >
                              <div className="min-w-0">
                                <code className="text-xs font-mono text-primary truncate block">
                                  {variable.key}
                                </code>
                                <p className="text-xs text-muted-foreground truncate">
                                  {variable.description}
                                </p>
                              </div>
                              <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 ml-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clauses" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cláusulas Padrão AURE</CardTitle>
                    <CardDescription>
                      Clique para inserir cláusulas jurídicas pré-redigidas no editor
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {STANDARD_CLAUSES.map((clause) => (
                      <div
                        key={clause.label}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-colors group"
                        onClick={() => {
                          if (editorRef.current) {
                            editorRef.current.insertVariable(clause.content);
                          } else {
                            setContent((prev) => prev + clause.content);
                          }
                          toast.success(`Cláusula "${clause.label}" inserida no editor`);
                        }}
                      >
                        <clause.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{clause.label}</p>
                          <div
                            className="text-xs text-muted-foreground line-clamp-2 mt-1 [&_h3]:hidden"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(clause.content.replace(/<h3>.*?<\/h3>/g, "")) }}
                          />
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Prévia do Contrato</CardTitle>
                    <CardDescription>
                      Visualização com dados de exemplo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none p-6 border rounded-lg bg-white text-black"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(renderPreviewHtml(content)),
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              {editingTemplate && (
                <TabsContent value="history" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Histórico de Versões</CardTitle>
                      <CardDescription>
                        Versões salvas automaticamente e manualmente
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingVersions ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : versions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="text-sm">Nenhuma versão salva ainda</p>
                          <p className="text-xs mt-1">As versões são criadas ao salvar o template</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {versions.map((version) => (
                            <div
                              key={version.id}
                              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                    v{version.version_number}
                                  </Badge>
                                  <p className="text-sm font-medium truncate">{version.name}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-3 shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setPreviewContent(version.content)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Pré-visualizar</TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => handleRestoreVersion(version)}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Restaurar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {previewContent && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Pré-visualização da versão</p>
                            <Button variant="ghost" size="sm" onClick={() => setPreviewContent(null)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div
                            className="prose prose-sm max-w-none p-4 border rounded-lg bg-white text-black max-h-[300px] overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent) }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter className="mt-6">
              <div className="flex items-center gap-2 mr-auto">
                {editingTemplate && autoSaveStatus === "saving" && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Save className="h-3 w-3 animate-pulse" /> Salvando...
                  </span>
                )}
                {editingTemplate && autoSaveStatus === "saved" && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Save className="h-3 w-3" /> Salvo automaticamente
                  </span>
                )}
                {editingTemplate && autoSaveStatus === "idle" && (
                  <span className="text-xs text-muted-foreground">Auto-save a cada 30s</span>
                )}
              </div>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateOrUpdateTemplate} disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : editingTemplate ? "Atualizar" : "Criar Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm" id="templates-banner" style={{ display: 'flex' }}>
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <span className="text-muted-foreground flex-1">
          Templates são modelos com variáveis dinâmicas preenchidas automaticamente ao criar contratos.
        </span>
        <button
          onClick={(e) => {
            const banner = (e.target as HTMLElement).closest('#templates-banner');
            if (banner) (banner as HTMLElement).style.display = 'none';
          }}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          aria-label="Fechar"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Templates Disponíveis</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <ErrorState title="Erro ao carregar templates" onRetry={fetchTemplates} />
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum template corresponde à busca" : "Nenhum template encontrado"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* System Templates Section */}
              {filteredTemplates.filter(t => t.is_system_default).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    🏛️ Templates da AURE (Sistema)
                  </h3>
                  {renderTemplateTable(filteredTemplates.filter(t => t.is_system_default))}
                </div>
              )}
              {/* Company Templates Section */}
              {filteredTemplates.filter(t => !t.is_system_default).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    🏢 Templates da Empresa
                  </h3>
                  {renderTemplateTable(filteredTemplates.filter(t => !t.is_system_default))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia do Template</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none p-6 border rounded-lg bg-white text-black"
            dangerouslySetInnerHTML={{
              __html: renderPreviewHtml(previewContent || ""),
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesContrato;
