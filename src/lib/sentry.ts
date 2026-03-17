import * as Sentry from "@sentry/react";

/**
 * Initializes Sentry error monitoring.
 * Only activates when VITE_SENTRY_DSN is set in the environment.
 * Safe no-op when DSN is absent (development / unconfigured builds).
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // "production" | "development"
    // Capture 100% of errors; adjust tracesSampleRate for performance tracing
    tracesSampleRate: 0.1,
    // Do not send PII breadcrumbs by default
    sendDefaultPii: false,
    // Ignore "ResizeObserver loop limit exceeded" – browser noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error exception captured",
    ],
    beforeSend(event) {
      // Strip sensitive query params from URLs before sending
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          url.searchParams.delete("token");
          url.searchParams.delete("access_token");
          url.searchParams.delete("refresh_token");
          event.request.url = url.toString();
        } catch {
          // ignore malformed URLs
        }
      }
      return event;
    },
  });
}

export { Sentry };
