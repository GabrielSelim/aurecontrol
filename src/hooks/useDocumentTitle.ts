import { useEffect } from "react";

/**
 * Sets the document title. Appends " | Aure" suffix automatically.
 * Restores previous title on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Aure` : "Aure";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
