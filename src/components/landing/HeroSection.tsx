import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Users, FileText, CreditCard } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 bg-gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-up">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Gestão empresarial simplificada
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Gerencie funcionários, contratos e pagamentos em{" "}
            <span className="text-gradient-primary">um só lugar</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Sistema completo para gestão de funcionários CLT e PJ, contratos digitais com assinatura eletrônica, e controle financeiro integrado.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/registro">
                Começar Grátis
                <ArrowRight size={20} />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/login">
                Já tenho conta
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              14 dias grátis
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              Suporte em português
            </div>
          </div>
        </div>

        {/* Feature Cards Preview */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeaturePreviewCard
            icon={<Users className="w-6 h-6" />}
            title="Gestão de Equipes"
            description="CLT e PJ em um só lugar"
            delay="0.5s"
          />
          <FeaturePreviewCard
            icon={<FileText className="w-6 h-6" />}
            title="Contratos Digitais"
            description="Assinatura eletrônica válida"
            delay="0.6s"
          />
          <FeaturePreviewCard
            icon={<CreditCard className="w-6 h-6" />}
            title="Pagamentos"
            description="Controle total de repasses"
            delay="0.7s"
          />
        </div>
      </div>
    </section>
  );
}

function FeaturePreviewCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-300 animate-fade-up"
      style={{ animationDelay: delay }}
    >
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
