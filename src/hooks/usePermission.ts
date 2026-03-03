import { useAuth } from "@/contexts/AuthContext";

type AppRole = "master_admin" | "admin" | "financeiro" | "juridico" | "gestor" | "colaborador" | "pj";

/**
 * Mapa de ações → roles que têm permissão
 * Use como: const podeEncerrar = usePermission("contract:terminate")
 */
const PERMISSIONS: Record<string, AppRole[]> = {
  // Contratos
  "contract:create":      ["master_admin", "admin"],
  "contract:edit":        ["master_admin", "admin"],
  "contract:terminate":   ["master_admin", "admin"],
  "contract:send":        ["master_admin", "admin"],
  "contract:view":        ["master_admin", "admin", "gestor", "juridico", "financeiro", "colaborador", "pj"],
  "contract:sign":        ["master_admin", "admin", "colaborador", "pj"],
  "contract:download_pdf":["master_admin", "admin", "juridico", "colaborador", "pj"],

  // Templates
  "template:create":      ["master_admin", "admin", "juridico"],
  "template:edit":        ["master_admin", "admin", "juridico"],
  "template:delete":      ["master_admin", "admin"],

  // Pagamentos
  "payment:view":         ["master_admin", "admin", "financeiro"],
  "payment:approve":      ["master_admin", "admin", "financeiro"],
  "payment:reject":       ["master_admin", "admin", "financeiro"],

  // Colaboradores
  "collaborator:view":    ["master_admin", "admin", "gestor", "financeiro"],
  "collaborator:edit":    ["master_admin", "admin", "gestor"],
  "collaborator:invite":  ["master_admin", "admin"],

  // Empresa
  "company:view":         ["master_admin", "admin"],
  "company:edit":         ["master_admin", "admin"],

  // Convites
  "invite:create":        ["master_admin", "admin"],
  "invite:revoke":        ["master_admin", "admin"],

  // Configurações
  "settings:view":        ["master_admin"],
  "settings:edit":        ["master_admin"],

  // Auditoria
  "audit:view":           ["master_admin", "admin"],

  // PJ específico
  "pj:view_own_contracts":["pj"],
  "pj:view_own_payments": ["pj"],
};

/**
 * Retorna `true` se o usuário logado tem permissão para executar a ação.
 *
 * @param action - Chave de permissão (ex: "contract:terminate")
 *
 * @example
 * const podeEncerrar = usePermission("contract:terminate");
 * if (!podeEncerrar) return null;
 */
export function usePermission(action: string): boolean {
  const { hasRole } = useAuth();
  const allowedRoles = PERMISSIONS[action];

  if (!allowedRoles) {
    console.warn(`[usePermission] ação desconhecida: "${action}"`);
    return false;
  }

  return allowedRoles.some((role) => hasRole(role));
}

/**
 * Retorna um objeto com múltiplas permissões de uma vez.
 *
 * @example
 * const perms = usePermissions(["contract:create", "contract:terminate"]);
 * if (perms["contract:create"]) ...
 */
export function usePermissions(actions: string[]): Record<string, boolean> {
  const { hasRole } = useAuth();

  return Object.fromEntries(
    actions.map((action) => {
      const allowedRoles = PERMISSIONS[action] ?? [];
      return [action, allowedRoles.some((role) => hasRole(role))];
    })
  );
}
