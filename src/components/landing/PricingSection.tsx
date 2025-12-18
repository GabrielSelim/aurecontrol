import { Check, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="precos" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Preços</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Pague apenas pelo que usar
          </h2>
          <p className="text-muted-foreground text-lg">
            Cobramos apenas pelos contratos PJ ativos. Gestão de CLT e outros recursos são gratuitos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* PJ Card */}
          <div className="bg-card border-2 border-primary rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                FATURÁVEL
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-foreground">Contratos PJ</h3>
                <p className="text-sm text-muted-foreground">Gestão completa de prestadores</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">R$ 29</span>
              <span className="text-muted-foreground">/contrato PJ ativo/mês</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Assinaturas digitais (em breve)",
                "Alertas de vencimento",
                "Controle de pagamentos",
                "Conformidade legal",
                "Histórico completo",
                "Relatórios detalhados",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full" size="lg" onClick={() => navigate("/registro")}>
              Começar agora
            </Button>
          </div>

          {/* CLT Card */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-foreground">Contratos CLT e outros</h3>
                <p className="text-sm text-muted-foreground">Gestão interna da empresa</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">Grátis</span>
              <span className="text-muted-foreground"> sempre</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Registro de contratos CLT",
                "Contratos de estágio",
                "Contratos temporários",
                "Organização interna",
                "Gestão de colaboradores",
                "Acesso a relatórios básicos",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" size="lg" onClick={() => navigate("/registro")}>
              Incluído no plano
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          * O valor por contrato PJ pode variar de acordo com pacotes promocionais e quantidade de contratos.
        </p>
      </div>
    </section>
  );
}
