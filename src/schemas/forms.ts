import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Invite Creation                                                   */
/* ------------------------------------------------------------------ */

export const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  inviteName: z.string().optional().default(""),
  role: z.enum(["admin", "colaborador", "financeiro", "gestor", "juridico"], {
    required_error: "Selecione um perfil",
  }),
  jobTitle: z.string().optional().default(""),
  expiryDays: z.string().default("7"),
  customMessage: z.string().optional().default(""),
  linkedContractId: z.string().optional().default(""),
});
export type InviteFormData = z.infer<typeof inviteSchema>;

/* ------------------------------------------------------------------ */
/*  Company Edit (Master Admin)                                       */
/* ------------------------------------------------------------------ */

export const companyEditSchema = z.object({
  name: z.string().min(1, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido").or(z.literal("")),
  email: z.string().email("E-mail inválido").or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
});
export type CompanyEditFormData = z.infer<typeof companyEditSchema>;

/* ------------------------------------------------------------------ */
/*  Billing Generation                                                */
/* ------------------------------------------------------------------ */

export const billingGenerateSchema = z.object({
  selectedCompany: z.string().min(1, "Selecione uma empresa"),
  referenceMonth: z.string().min(1, "Selecione o mês de referência"),
});
export type BillingGenerateFormData = z.infer<typeof billingGenerateSchema>;
