import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, Users, Percent, Gift, Clock, HelpCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const pricingTiers = [
  {
    name: "Básico",
    contracts: "1-10",
    pricePerContract: 29,
    description: "Ideal para pequenas empresas",
    features: [
      "Gestão completa de contratos PJ",
      "Alertas de vencimento",
      "Controle de pagamentos",
      "Relatórios básicos",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Profissional",
    contracts: "11-50",
    pricePerContract: 25,
    description: "Para empresas em crescimento",
    popular: true,
    features: [
      "Tudo do plano Básico",
      "Assinaturas digitais (em breve)",
      "Relatórios avançados",
      "API de integração",
      "Suporte prioritário",
    ],
  },
  {
    name: "Empresarial",
    contracts: "51+",
    pricePerContract: 19,
    description: "Para grandes operações",
    features: [
      "Tudo do plano Profissional",
      "Gerente de conta dedicado",
      "Treinamento personalizado",
      "SLA garantido",
      "Integrações customizadas",
    ],
  },
];

const faqs = [
  {
    question: "O que é considerado um contrato PJ ativo?",
    answer: "Um contrato PJ ativo é qualquer contrato de prestação de serviços com um profissional pessoa jurídica que esteja com status 'ativo' no sistema. Contratos encerrados, cancelados ou expirados não são cobrados.",
  },
  {
    question: "Contratos CLT são cobrados?",
    answer: "Não! Contratos CLT, de estágio, temporários e outros tipos são totalmente gratuitos. Eles servem para você organizar a gestão interna da sua empresa sem custos adicionais.",
  },
  {
    question: "Como funciona a cobrança mensal?",
    answer: "No início de cada mês, contamos quantos contratos PJ ativos sua empresa possui e geramos uma fatura com base no seu pacote de preços. O vencimento padrão é dia 10 de cada mês.",
  },
  {
    question: "Posso mudar de pacote a qualquer momento?",
    answer: "Sim! À medida que sua empresa cresce, você automaticamente migra para pacotes com preços mais vantajosos. Não é necessário nenhuma ação manual.",
  },
  {
    question: "Existe período de teste gratuito?",
    answer: "Sim! Novos usuários têm 14 dias para testar a plataforma gratuitamente, sem compromisso. Após esse período, a cobrança é feita apenas pelos contratos PJ ativos.",
  },
  {
    question: "Como funcionam os cupons de desconto?",
    answer: "Cupons podem ser aplicados no momento do cadastro ou posteriormente pelo administrador master. Eles podem oferecer descontos percentuais ou valores fixos, com uso único ou recorrente.",
  },
];

export default function Precos() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 md:pt-24">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4">
              Preços transparentes
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Pague apenas por contratos PJ
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Gestão de CLT e outros tipos de contrato são <strong>100% gratuitos</strong>. 
              Você só paga pelos contratos PJ ativos na sua empresa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/registro")}>
                Começar gratuitamente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                Já tenho conta
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Pacotes por volume
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Quanto mais contratos PJ você gerencia, menor o preço por contrato.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {pricingTiers.map((tier) => (
                <Card 
                  key={tier.name} 
                  className={`relative ${tier.popular ? "border-primary shadow-lg scale-105" : ""}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Mais popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-4xl font-bold text-foreground">
                        R$ {tier.pricePerContract}
                      </span>
                      <span className="text-muted-foreground">/contrato PJ/mês</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {tier.contracts} contratos PJ ativos
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full mt-6" 
                      variant={tier.popular ? "default" : "outline"}
                      onClick={() => navigate("/registro")}
                    >
                      Começar agora
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Free Features */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <Gift className="h-3 w-3 mr-1" />
                Incluído gratuitamente
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Gestão interna sem custos
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Contratos CLT e outros tipos são gratuitos para sempre.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Users, title: "Contratos CLT", description: "Registre todos os funcionários CLT" },
                { icon: FileText, title: "Estágio", description: "Gerencie estagiários facilmente" },
                { icon: Clock, title: "Temporários", description: "Contratos de trabalho temporário" },
                { icon: Users, title: "Gestão de equipe", description: "5 tipos de usuários e permissões" },
              ].map((item) => (
                <Card key={item.title} className="text-center">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Discounts Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <Percent className="h-3 w-3 mr-1" />
                Descontos disponíveis
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Economize ainda mais
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card className="border-dashed">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <Gift className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Cupons de desconto</CardTitle>
                  <CardDescription>
                    Use cupons promocionais para obter descontos em porcentagem ou valor fixo na sua fatura mensal.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-dashed">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Promoções por tempo</CardTitle>
                  <CardDescription>
                    Fique atento às promoções sazonais com descontos especiais por tempo limitado.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-dashed">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Volume de contratos</CardTitle>
                  <CardDescription>
                    Quanto mais contratos PJ você gerencia, automaticamente paga menos por contrato.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <HelpCircle className="h-3 w-3 mr-1" />
                Dúvidas frequentes
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Perguntas sobre preços
              </h2>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="bg-primary rounded-3xl p-8 md:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Pronto para começar?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Crie sua conta gratuitamente e experimente por 14 dias sem compromisso.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => navigate("/registro")}
                >
                  Criar conta grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => navigate("/login")}
                >
                  Falar com vendas
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
