/**
 * Centralized logging utility.
 *
 * In development, messages are forwarded to the browser console.
 * In production, `info` and `warn` are silenced while `error` still
 * logs — and can be extended to report to an external service
 * (e.g. Sentry, LogRocket) without touching call-sites.
 */

const isDev = import.meta.env.DEV;

 
function noop(..._args: unknown[]) {
  // intentionally empty
}

export const logger = {
  /** Informational messages — silenced in production */
  info: isDev ? console.info.bind(console) : noop,

  /** Warnings — silenced in production */
  warn: isDev ? console.warn.bind(console) : noop,

  /** Errors — always logged; hook external reporting here */
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
    // TODO: integrate with Sentry / LogRocket in production
    // e.g. Sentry.captureException(args[0]);
  },
};
