import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const commonJobTitles = [
  // Tecnologia
  { value: "Desenvolvedor", category: "Tecnologia" },
  { value: "Desenvolvedor Full Stack", category: "Tecnologia" },
  { value: "Desenvolvedor Front-end", category: "Tecnologia" },
  { value: "Desenvolvedor Back-end", category: "Tecnologia" },
  { value: "Analista de Sistemas", category: "Tecnologia" },
  { value: "Engenheiro de Software", category: "Tecnologia" },
  { value: "Analista de Dados", category: "Tecnologia" },
  { value: "DevOps", category: "Tecnologia" },
  { value: "Suporte Técnico", category: "Tecnologia" },
  { value: "Administrador de Banco de Dados", category: "Tecnologia" },
  
  // Administrativo
  { value: "Assistente Administrativo", category: "Administrativo" },
  { value: "Auxiliar Administrativo", category: "Administrativo" },
  { value: "Secretária Executiva", category: "Administrativo" },
  { value: "Recepcionista", category: "Administrativo" },
  { value: "Office Manager", category: "Administrativo" },
  
  // Financeiro
  { value: "Contador", category: "Financeiro" },
  { value: "Analista Financeiro", category: "Financeiro" },
  { value: "Analista Contábil", category: "Financeiro" },
  { value: "Controller", category: "Financeiro" },
  { value: "Tesoureiro", category: "Financeiro" },
  { value: "Auxiliar Financeiro", category: "Financeiro" },
  
  // Jurídico
  { value: "Advogado", category: "Jurídico" },
  { value: "Advogado Trabalhista", category: "Jurídico" },
  { value: "Advogado Tributarista", category: "Jurídico" },
  { value: "Paralegal", category: "Jurídico" },
  { value: "Analista Jurídico", category: "Jurídico" },
  
  // Recursos Humanos
  { value: "Analista de RH", category: "RH" },
  { value: "Gerente de RH", category: "RH" },
  { value: "Recrutador", category: "RH" },
  { value: "Especialista em Folha de Pagamento", category: "RH" },
  { value: "Business Partner de RH", category: "RH" },
  
  // Comercial/Vendas
  { value: "Vendedor", category: "Comercial" },
  { value: "Consultor de Vendas", category: "Comercial" },
  { value: "Executivo de Contas", category: "Comercial" },
  { value: "Gerente Comercial", category: "Comercial" },
  { value: "Representante Comercial", category: "Comercial" },
  
  // Marketing
  { value: "Analista de Marketing", category: "Marketing" },
  { value: "Gerente de Marketing", category: "Marketing" },
  { value: "Designer Gráfico", category: "Marketing" },
  { value: "Social Media", category: "Marketing" },
  { value: "Copywriter", category: "Marketing" },
  
  // Gestão
  { value: "Diretor Executivo (CEO)", category: "Gestão" },
  { value: "Diretor Financeiro (CFO)", category: "Gestão" },
  { value: "Diretor de Operações (COO)", category: "Gestão" },
  { value: "Gerente de Projetos", category: "Gestão" },
  { value: "Coordenador", category: "Gestão" },
  { value: "Supervisor", category: "Gestão" },
  { value: "Sócio", category: "Gestão" },
  { value: "Proprietário", category: "Gestão" },
  
  // Operacional
  { value: "Auxiliar de Produção", category: "Operacional" },
  { value: "Operador de Máquinas", category: "Operacional" },
  { value: "Técnico de Manutenção", category: "Operacional" },
  { value: "Gerente de Manutenção", category: "Operacional" },
  { value: "Engenheiro de Produção", category: "Operacional" },
  
  // Serviços Gerais
  { value: "Auxiliar de Limpeza", category: "Serviços" },
  { value: "Porteiro", category: "Serviços" },
  { value: "Motorista", category: "Serviços" },
  { value: "Auxiliar de Cozinha", category: "Serviços" },
  { value: "Cozinheiro", category: "Serviços" },
  { value: "Atendente", category: "Serviços" },
  
  // Saúde
  { value: "Médico", category: "Saúde" },
  { value: "Enfermeiro", category: "Saúde" },
  { value: "Técnico de Enfermagem", category: "Saúde" },
  { value: "Fisioterapeuta", category: "Saúde" },
  { value: "Psicólogo", category: "Saúde" },
];

interface JobTitleComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function JobTitleCombobox({ value, onChange, placeholder = "Selecione ou digite um cargo" }: JobTitleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const filteredTitles = commonJobTitles.filter((title) =>
    title.value.toLowerCase().includes(inputValue.toLowerCase())
  );

  const groupedTitles = filteredTitles.reduce((acc, title) => {
    if (!acc[title.category]) {
      acc[title.category] = [];
    }
    acc[title.category].push(title);
    return acc;
  }, {} as Record<string, typeof commonJobTitles>);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 bg-popover" 
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar cargo..." 
            value={inputValue}
            onValueChange={(val) => {
              setInputValue(val);
              onChange(val);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                onChange(inputValue.trim());
                setOpen(false);
              }
              if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          <div className="max-h-[200px] overflow-y-auto">
            {filteredTitles.length === 0 ? (
              <div className="py-4 text-center text-sm">
                <p className="text-muted-foreground">Nenhum cargo encontrado na lista.</p>
                {inputValue.trim() && (
                  <button
                    className="mt-2 text-primary font-medium text-xs underline underline-offset-2 hover:opacity-80"
                    onClick={() => {
                      onChange(inputValue.trim());
                      setOpen(false);
                    }}
                  >
                    Usar "{inputValue.trim()}" como cargo personalizado
                  </button>
                )}
              </div>
            ) : (
              Object.entries(groupedTitles).map(([category, titles]) => (
                <div key={category} className="p-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {category}
                  </div>
                  {titles.map((title) => (
                    <div
                      key={title.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        value === title.value && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => {
                        onChange(title.value);
                        setInputValue(title.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === title.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {title.value}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
