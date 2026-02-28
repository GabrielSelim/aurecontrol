import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { atualizarSenhaSchema, type AtualizarSenhaFormData } from "@/schemas/auth";

const AtualizarSenha = () => {
  useDocumentTitle("Atualizar Senha");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  const form = useForm<AtualizarSenhaFormData>({
    resolver: zodResolver(atualizarSenhaSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!session) {
      navigate("/login");
    }
  }, [session, navigate]);

  const onSubmit = async (data: AtualizarSenhaFormData) => {
    const { error } = await updatePassword(data.password);

    if (error) {
      toast.error("Erro ao atualizar senha");
    } else {
      setPasswordUpdated(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <span className="font-bold text-2xl text-foreground">Aure</span>
          </div>

          {!passwordUpdated ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Criar nova senha
                </h1>
                <p className="text-muted-foreground">
                  Digite sua nova senha abaixo
                </p>
              </div>

              {/* Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-12 pr-12"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Mín. 8 caracteres com maiúscula, minúscula, número e especial
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar nova senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-12 pr-12"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Atualizando..." : "Atualizar senha"}
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
                Senha atualizada!
              </h2>
              <p className="text-muted-foreground mb-6">
                Sua senha foi alterada com sucesso. Você já pode usar sua nova senha
                para acessar sua conta.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                size="lg"
                className="w-full"
              >
                Ir para o painel
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
          <Lock className="w-20 h-20 text-primary-foreground mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Segurança em primeiro lugar
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Crie uma senha forte para proteger sua conta e seus dados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AtualizarSenha;
