import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-foreground py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo_aure.svg" alt="Aure" className="h-9 w-auto" />
              <span className="font-bold text-xl text-primary-foreground">Aure</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Sistema completo de gestão empresarial para funcionários CLT e PJ.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Produto</h4>
            <ul className="space-y-3">
              <li>
                <a href="#recursos" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#precos" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Preços
                </a>
              </li>
              <li>
                <a href="/integracoes" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Integrações
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Empresa</h4>
            <ul className="space-y-3">
              <li>
                <a href="#sobre" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Sobre nós
                </a>
              </li>
              <li>
                <a href="/blog" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="/contato" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a href="/termos" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="/privacidade" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="/lgpd" className="text-muted-foreground hover:text-primary-foreground text-sm transition-colors">
                  LGPD
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Aure. Todos os direitos reservados.
          </p>
          <p className="text-muted-foreground text-sm">
            Feito com ❤️ no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
