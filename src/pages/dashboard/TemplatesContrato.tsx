import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
}

const TEMPLATE_VARIABLES = [
  { key: "{{company_name}}", description: "Nome da empresa contratante" },
  { key: "{{company_cnpj}}", description: "CNPJ da empresa contratante" },
  { key: "{{company_address}}", description: "Endereço da empresa" },
  { key: "{{company_city}}", description: "Cidade da empresa" },
  { key: "{{company_representative_name}}", description: "Nome do representante da empresa" },
  { key: "{{contractor_name}}", description: "Nome do contratado (PJ)" },
  { key: "{{contractor_cpf}}", description: "CPF do representante do contratado" },
  { key: "{{contractor_company_name}}", description: "Razão social do contratado" },
  { key: "{{contractor_cnpj}}", description: "CNPJ do contratado" },
  { key: "{{contractor_address}}", description: "Endereço do contratado" },
  { key: "{{job_title}}", description: "Cargo/função" },
  { key: "{{salary}}", description: "Valor do contrato" },
  { key: "{{start_date}}", description: "Data de início" },
  { key: "{{end_date}}", description: "Data de término (se houver)" },
  { key: "{{current_date}}", description: "Data atual" },
  { key: "{{city}}", description: "Cidade de assinatura" },
];

const TemplatesContrato = () => {
  const { profile, isAdmin, hasRole } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [witnessCount, setWitnessCount] = useState("2");

  const isMasterAdmin = hasRole("master_admin");
  const canManageTemplates = isAdmin() || hasRole("juridico") || isMasterAdmin;

  useEffect(() => {
    fetchTemplates();
  }, [profile?.company_id]);

  const fetchTemplates = async () => {
    try {
      let query = supabase
        .from("contract_templates")
        .select("*")
        .eq("is_active", true)
        .order("is_system_default", { ascending: false })
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Erro ao carregar templates");
    } finally {
      setIsLoading(false);
    }
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
        const { error } = await supabase
          .from("contract_templates")
          .update({
            name,
            description: description || null,
            content,
            default_witness_count: parseInt(witnessCount),
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template atualizado com sucesso!");
      } else {
        // Create new template
        const { error } = await supabase.from("contract_templates").insert({
          company_id: isMasterAdmin ? null : profile?.company_id,
          name,
          description: description || null,
          content,
          default_witness_count: parseInt(witnessCount),
          is_system_default: isMasterAdmin && !profile?.company_id,
          created_by: profile?.user_id,
        });

        if (error) throw error;
        toast.success("Template criado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error?.message || "Erro ao salvar template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || "");
    setContent(template.content);
    setWitnessCount(template.default_witness_count.toString());
    setIsDialogOpen(true);
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const { error } = await supabase.from("contract_templates").insert({
        company_id: profile?.company_id,
        name: `${template.name} (Cópia)`,
        description: template.description,
        content: template.content,
        default_witness_count: template.default_witness_count,
        is_system_default: false,
        created_by: profile?.user_id,
      });

      if (error) throw error;
      toast.success("Template duplicado com sucesso!");
      fetchTemplates();
    } catch (error: any) {
      console.error("Error duplicating template:", error);
      toast.error(error?.message || "Erro ao duplicar template");
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (template.is_system_default && !isMasterAdmin) {
      toast.error("Não é possível excluir templates do sistema");
      return;
    }

    try {
      const { error } = await supabase
        .from("contract_templates")
        .update({ is_active: false })
        .eq("id", template.id);

      if (error) throw error;
      toast.success("Template excluído com sucesso!");
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error(error?.message || "Erro ao excluir template");
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setContent("");
    setWitnessCount("2");
  };

  const insertVariable = (variable: string) => {
    setContent((prev) => prev + variable);
  };

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="variables">Variáveis</TabsTrigger>
                <TabsTrigger value="preview">Prévia</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="content">Conteúdo HTML do Contrato *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="<div>Cole ou escreva o HTML do contrato aqui...</div>"
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="variables" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variáveis Disponíveis</CardTitle>
                    <CardDescription>
                      Clique em uma variável para adicioná-la ao template
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <div
                          key={variable.key}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => insertVariable(variable.key)}
                        >
                          <div>
                            <code className="text-sm font-mono text-primary">
                              {variable.key}
                            </code>
                            <p className="text-sm text-muted-foreground mt-1">
                              {variable.description}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
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
                        __html: content
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
                          .replace(/\{\{start_date\}\}/g, "01/01/2025")
                          .replace(/\{\{end_date\}\}/g, "31/12/2025")
                          .replace(/\{\{current_date\}\}/g, format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
                          .replace(/\{\{city\}\}/g, "São Paulo")
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
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
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Sobre os Templates</p>
            <p className="text-muted-foreground mt-1">
              Templates são modelos de contrato com variáveis dinâmicas que serão preenchidas automaticamente 
              com os dados do contratante e contratado. Você pode usar o template padrão do sistema ou criar 
              templates personalizados para sua empresa.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum template encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Testemunhas</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.is_system_default ? (
                        <Badge variant="secondary">Sistema</Badge>
                      ) : (
                        <Badge variant="outline">Personalizado</Badge>
                      )}
                    </TableCell>
                    <TableCell>{template.default_witness_count}</TableCell>
                    <TableCell>
                      {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewContent(template.content)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              __html: (previewContent || "")
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
                .replace(/\{\{start_date\}\}/g, "01/01/2025")
                .replace(/\{\{end_date\}\}/g, "31/12/2025")
                .replace(/\{\{current_date\}\}/g, format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
                .replace(/\{\{city\}\}/g, "São Paulo")
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesContrato;