import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("E-mail inválido");

const RecuperarSenha = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast.error("Por favor, insira um e-mail válido");
      return;
    }

    setIsLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      toast.error("Erro ao enviar e-mail de recuperação");
    } else {
      setEmailSent(true);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <span className="font-bold text-2xl text-foreground">Aure</span>
          </div>

          {!emailSent ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Recuperar senha
                </h1>
                <p className="text-muted-foreground">
                  Digite seu e-mail para receber as instruções de recuperação
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar e-mail de recuperação"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                E-mail enviado!
              </h2>
              <p className="text-muted-foreground mb-6">
                Se existe uma conta com o e-mail <strong>{email}</strong>, você receberá
                as instruções para redefinir sua senha.
              </p>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
        </div>

        <div className="relative text-center max-w-lg">
          <Mail className="w-20 h-20 text-primary-foreground mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Não se preocupe!
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Vamos te ajudar a recuperar o acesso à sua conta de forma segura.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecuperarSenha;
