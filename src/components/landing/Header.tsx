import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { LogoAure } from "@/components/LogoAure";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <LogoAure size="md" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {isHomePage ? (
              <a href="#recursos" className="text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </a>
            ) : (
              <Link to="/#recursos" className="text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </Link>
            )}
            <Link 
              to="/precos" 
              className={`transition-colors ${location.pathname === "/precos" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Preços
            </Link>
            {isHomePage ? (
              <a href="#sobre" className="text-muted-foreground hover:text-foreground transition-colors">
                Sobre
              </a>
            ) : (
              <Link to="/#sobre" className="text-muted-foreground hover:text-foreground transition-colors">
                Sobre
              </Link>
            )}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/registro">Começar Grátis</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {isHomePage ? (
                <a
                  href="#recursos"
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Recursos
                </a>
              ) : (
                <Link
                  to="/#recursos"
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Recursos
                </Link>
              )}
              <Link
                to="/precos"
                className={`transition-colors py-2 ${location.pathname === "/precos" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Preços
              </Link>
              {isHomePage ? (
                <a
                  href="#sobre"
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sobre
                </a>
              ) : (
                <Link
                  to="/#sobre"
                  className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sobre
                </Link>
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/registro">Começar Grátis</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
