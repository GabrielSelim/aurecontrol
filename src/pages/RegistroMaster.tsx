import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogoAure } from "@/components/LogoAure";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Eye, EyeOff, ArrowLeft, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatCPF, formatPhone } from "@/lib/masks";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { registroMasterSchema, type RegistroMasterFormData } from "@/schemas/auth";

const RegistroMaster = () => {
  const [showPassword, setShowPassword] = useState(false);
  useDocumentTitle("Registro Master");
  const { signUpAsMasterAdmin } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegistroMasterFormData>({
    resolver: zodResolver(registroMasterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      cpf: "",
      phone: "",
      password: "",
      acceptedTerms: false as unknown as true,
      acceptedPrivacy: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegistroMasterFormData) => {
    const { error } = await signUpAsMasterAdmin({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      cpf: data.cpf.replace(/\D/g, ""),
      phone: data.phone.replace(/\D/g, ""),
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        toast.error("Este e-mail já está cadastrado");
      } else {
        toast.error("Erro ao criar conta. Tente novamente.");
      }
    } else {
      toast.success("Conta Master Admin criada com sucesso!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
        </div>

        <div className="relative text-center max-w-lg">
          <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Registro Master Admin
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Crie a conta de super administrador do sistema com acesso total a todas as empresas e funcionalidades.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            Voltar para o início
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <LogoAure size="lg" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Criar Master Admin
            </h1>
            <p className="text-muted-foreground">
              Preencha seus dados para criar a conta de super administrador
            </p>
            <div className="mt-4">
              <Badge variant="destructive" className="gap-1">
                <Shield className="w-3 h-3" />
                Master Admin
              </Badge>
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Seu nome completo"
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="h-12"
                        {...field}
                        onChange={(e) => field.onChange(formatCPF(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className="h-12"
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres"
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

              {/* Terms */}
              <div className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-muted-foreground leading-tight cursor-pointer font-normal">
                        Li e aceito os{" "}
                        <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Termos de Uso
                        </a>
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptedPrivacy"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-muted-foreground leading-tight cursor-pointer font-normal">
                        Li e aceito a{" "}
                        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Política de Privacidade
                        </a>
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta Master Admin"
                )}
              </Button>
            </form>
          </Form>

          {/* Login Link */}
          <p className="text-center text-muted-foreground mt-8">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistroMaster;
