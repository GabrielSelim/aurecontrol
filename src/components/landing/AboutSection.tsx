import { Target, Heart, Shield } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Missão",
    description: "Simplificar a gestão de prestadores de serviços para empresas de todos os tamanhos, oferecendo uma plataforma completa e acessível.",
  },
  {
    icon: Heart,
    title: "Valores",
    description: "Transparência, simplicidade e foco no cliente. Acreditamos que tecnologia deve facilitar a vida, não complicar.",
  },
  {
    icon: Shield,
    title: "Compromisso",
    description: "Segurança e conformidade legal são prioridades. Seus dados estão protegidos e em conformidade com a LGPD.",
  },
];

export function AboutSection() {
  return (
    <section id="sobre" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Sobre nós</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-6">
              Gestão de contratos PJ simplificada
            </h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              O <strong className="text-foreground">Aure System</strong> nasceu da necessidade real de empresas que trabalham 
              com prestadores de serviços PJ e precisam de uma forma organizada, segura e eficiente 
              de gerenciar contratos, pagamentos e documentação.
            </p>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Nossa plataforma foi desenvolvida para atender desde pequenas empresas até grandes 
              operações, com foco em simplicidade de uso e conformidade legal. Você paga apenas 
              pelos contratos PJ ativos — gestão de CLT e outros tipos é sempre gratuita.
            </p>
            
            <div className="flex items-center gap-8 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">Empresas</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">10k+</p>
                <p className="text-sm text-muted-foreground">Contratos gerenciados</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
            </div>
          </div>

          {/* Right Content - Values */}
          <div className="space-y-6">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="group flex gap-4 p-6 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <value.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
