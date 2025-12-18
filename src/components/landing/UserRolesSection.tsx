import { Crown, Calculator, Scale, Users, User } from "lucide-react";

const roles = [
  {
    icon: Crown,
    title: "Administrador",
    description: "Controle total: pagamentos, convites, contratos e configurações.",
    permissions: ["Efetuar pagamentos", "Convidar usuários", "Gerenciar contratos", "Todos os relatórios"],
    color: "bg-warning/10 text-warning",
  },
  {
    icon: Calculator,
    title: "Financeiro",
    description: "Gestão completa dos pagamentos da empresa.",
    permissions: ["Gerenciar pagamentos", "Aprovar/rejeitar", "Visualizar relatórios"],
    color: "bg-success/10 text-success",
  },
  {
    icon: Scale,
    title: "Jurídico",
    description: "Gestão de contratos e documentação legal.",
    permissions: ["Criar contratos", "Gerenciar documentos", "Alterar cargos"],
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    title: "Gestor",
    description: "Gestão da equipe e colaboradores.",
    permissions: ["Ver colaboradores", "Gerenciar equipe", "Acompanhar desempenho"],
    color: "bg-accent/10 text-accent",
  },
  {
    icon: User,
    title: "Colaborador",
    description: "Acesso aos próprios dados e contratos.",
    permissions: ["Ver próprio perfil", "Ver contratos", "Atualizar dados"],
    color: "bg-muted-foreground/10 text-muted-foreground",
  },
];

export function UserRolesSection() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Permissões</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            5 tipos de usuários, cada um no seu lugar
          </h2>
          <p className="text-muted-foreground text-lg">
            Hierarquia clara de permissões para manter sua empresa organizada e segura.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {roles.map((role, index) => (
            <RoleCard key={role.title} {...role} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  permissions,
  color,
  index,
}: {
  icon: typeof Crown;
  title: string;
  description: string;
  permissions: string[];
  color: string;
  index: number;
}) {
  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <ul className="space-y-2">
        {permissions.map((permission) => (
          <li key={permission} className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}
