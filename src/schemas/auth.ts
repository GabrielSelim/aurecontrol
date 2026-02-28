import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Shared validators                                                 */
/* ------------------------------------------------------------------ */

export const passwordRules = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número")
  .regex(
    /[^A-Za-z0-9]/,
    "A senha deve conter pelo menos um caractere especial"
  );

/* ------------------------------------------------------------------ */
/*  Login                                                             */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

/* ------------------------------------------------------------------ */
/*  Password Recovery                                                 */
/* ------------------------------------------------------------------ */

export const recuperarSenhaSchema = z.object({
  email: z.string().email("E-mail inválido"),
});
export type RecuperarSenhaFormData = z.infer<typeof recuperarSenhaSchema>;

/* ------------------------------------------------------------------ */
/*  Update Password                                                   */
/* ------------------------------------------------------------------ */

export const atualizarSenhaSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
export type AtualizarSenhaFormData = z.infer<typeof atualizarSenhaSchema>;

/* ------------------------------------------------------------------ */
/*  Master Admin Registration                                         */
/* ------------------------------------------------------------------ */

export const registroMasterSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  password: passwordRules,
  acceptedTerms: z.literal(true, {
    errorMap: () => ({
      message: "Você precisa aceitar os termos para continuar",
    }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({
      message: "Você precisa aceitar a política de privacidade",
    }),
  }),
});
export type RegistroMasterFormData = z.infer<typeof registroMasterSchema>;
