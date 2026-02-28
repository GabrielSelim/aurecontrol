import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const IDLE_WARNING_MS = 25 * 60 * 1000; // 25 min — warn user
const IDLE_LOGOUT_MS = 30 * 60 * 1000;  // 30 min — auto-logout

/**
 * Tracks user inactivity. After 25 min shows a toast warning;
 * after 30 min of total inactivity, signs the user out.
 */
export function useSessionTimeout() {
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const toastId = useRef<string | number>();

  const logout = useCallback(async () => {
    toast.dismiss(toastId.current);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  const resetTimers = useCallback(() => {
    // Dismiss active warning if user interacted
    if (toastId.current) {
      toast.dismiss(toastId.current);
      toastId.current = undefined;
    }

    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);

    warningTimer.current = setTimeout(() => {
      toastId.current = toast.warning("Sua sessão expira em 5 minutos por inatividade.", {
        duration: Infinity,
        action: {
          label: "Continuar",
          onClick: () => resetTimers(),
        },
      });
    }, IDLE_WARNING_MS);

    logoutTimer.current = setTimeout(() => {
      logout();
    }, IDLE_LOGOUT_MS);
  }, [logout]);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ["mousedown", "keydown", "scroll", "touchstart"];

    const handler = () => resetTimers();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [resetTimers]);
}
