import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { recuperarSenhaSchema, type RecuperarSenhaFormData } from "@/schemas/auth";

const RecuperarSenha = () => {
  useDocumentTitle("Recuperar Senha");
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const form = useForm<RecuperarSenhaFormData>({
    resolver: zodResolver(recuperarSenhaSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: RecuperarSenhaFormData) => {
    const { error } = await resetPassword(data.email);

    if (error) {
      toast.error("Erro ao enviar e-mail de recuperação");
    } else {
      setEmailSent(true);
    }
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            className="h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Enviando..." : "Enviar e-mail de recuperação"}
                  </Button>
                </form>
              </Form>
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
                Se existe uma conta com o e-mail <strong>{form.getValues("email")}</strong>, você receberá
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
