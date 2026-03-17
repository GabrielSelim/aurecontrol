/**
 * Centralized logging utility.
 *
 * In development, messages are forwarded to the browser console.
 * In production, `info` and `warn` are silenced while `error` still
 * logs to Sentry (when VITE_SENTRY_DSN is configured).
 */
import { Sentry } from "./sentry";

const isDev = import.meta.env.DEV;

function noop(..._args: unknown[]) {
  // intentionally empty
}

export const logger = {
  /** Informational messages — silenced in production */
  info: isDev ? console.info.bind(console) : noop,

  /** Warnings — silenced in production */
  warn: isDev ? console.warn.bind(console) : noop,

  /** Errors — logged to console in dev, reported to Sentry in production */
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
    // Report to Sentry (no-op when DSN is not configured)
    const err = args[0];
    if (err instanceof Error) {
      Sentry.captureException(err, {
        extra: args.length > 1 ? { context: args.slice(1) } : undefined,
      });
    } else {
      Sentry.captureMessage(
        typeof err === "string" ? err : JSON.stringify(err),
        "error"
      );
    }
  },
};
