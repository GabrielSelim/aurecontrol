import { logger } from "@/lib/logger";

/**
 * Standard API error handler.
 *
 * Logs the full error via the logger, and returns a safe, user-friendly
 * message that never leaks internal details (Postgres error codes, etc.).
 *
 * Usage in catch blocks:
 *   catch (error) {
 *     const msg = handleApiError(error, "Erro ao salvar contrato");
 *     toast.error(msg);
 *   }
 */
export function handleApiError(
  error: unknown,
  fallbackMessage = "Ocorreu um erro inesperado",
): string {
  logger.error(fallbackMessage, error);

  // Surface known safe messages; hide everything else
  if (error instanceof Error) {
    const msg = error.message;

    // Allow simple, non-technical messages through
    if (
      msg.length < 120 &&
      !msg.includes("duplicate key") &&
      !msg.includes("violates") &&
      !msg.includes("PGRST") &&
      !msg.includes("JWT") &&
      !msg.includes("FetchError") &&
      !msg.includes("NetworkError")
    ) {
      return msg;
    }
  }

  return fallbackMessage;
}
