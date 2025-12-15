import { Users, FileText, CreditCard, Shield, Bell, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Gestão de Funcionários",
    description: "Gerencie funcionários CLT e prestadores PJ com diferentes níveis de acesso e permissões.",
  },
  {
    icon: FileText,
    title: "Contratos Digitais",
    description: "Crie, envie e assine contratos digitalmente com validade jurídica e rastreamento completo.",
  },
  {
    icon: CreditCard,
    title: "Controle de Pagamentos",
    description: "Processe pagamentos para PJs, controle vencimentos e mantenha histórico completo.",
  },
  {
    icon: Shield,
    title: "Segurança LGPD",
    description: "Dados criptografados, auditoria completa e conformidade com a legislação brasileira.",
  },
  {
    icon: Bell,
    title: "Notificações Inteligentes",
    description: "Alertas automáticos de vencimentos, pagamentos e pendências para toda equipe.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Completos",
    description: "Dashboards e relatórios detalhados para tomada de decisão estratégica.",
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Recursos</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Tudo que você precisa para gerenciar sua empresa
          </h2>
          <p className="text-muted-foreground text-lg">
            Uma plataforma completa para simplificar a gestão de pessoas, contratos e finanças.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <div
      className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 hover:shadow-xl transition-all duration-300"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-xl text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
