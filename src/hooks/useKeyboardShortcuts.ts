import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global keyboard shortcuts for dashboard navigation.
 * All shortcuts use Ctrl+Shift+<Key>.
 *
 * H — Home (Visão Geral)
 * C — Colaboradores
 * T — Contratos
 * P — Pagamentos
 * I — Convites
 * E — Empresa
 * N — Notificações
 * K — Configurações
 */
const SHORTCUTS: Record<string, string> = {
  h: "/dashboard",
  c: "/dashboard/colaboradores",
  t: "/dashboard/contratos",
  p: "/dashboard/pagamentos",
  i: "/dashboard/convites",
  e: "/dashboard/empresa",
  n: "/dashboard/notificacoes",
  k: "/dashboard/configuracoes",
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only fire when Ctrl+Shift is held and no input/textarea is focused
      if (!e.ctrlKey || !e.shiftKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const route = SHORTCUTS[e.key.toLowerCase()];
      if (route) {
        e.preventDefault();
        navigate(route);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
