/**
 * Centralised, type-safe TanStack Query key factory.
 *
 * Convention — each domain exposes a `keys` object with:
 *   • `all`        – root key (used for broad invalidation)
 *   • `lists()`    – all list-type queries
 *   • `list(…)`    – a specific filtered list
 *   • `details()`  – all detail queries
 *   • `detail(id)` – a single entity
 *
 * Usage:
 *   queryKey: queryKeys.companies.list(companyId)
 *   queryClient.invalidateQueries({ queryKey: queryKeys.companies.all })
 */

export const queryKeys = {
  /* ------------------------------------------------------------------ */
  /*  Companies                                                         */
  /* ------------------------------------------------------------------ */
  companies: {
    all: ["companies"] as const,
    lists: () => [...queryKeys.companies.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.companies.lists(), filters] as const,
    details: () => [...queryKeys.companies.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Profiles                                                          */
  /* ------------------------------------------------------------------ */
  profiles: {
    all: ["profiles"] as const,
    lists: () => [...queryKeys.profiles.all, "list"] as const,
    list: (companyId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.profiles.lists(), companyId, filters] as const,
    details: () => [...queryKeys.profiles.all, "detail"] as const,
    detail: (userId: string) => [...queryKeys.profiles.details(), userId] as const,
    count: (companyId: string) =>
      [...queryKeys.profiles.all, "count", companyId] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Contracts                                                         */
  /* ------------------------------------------------------------------ */
  contracts: {
    all: ["contracts"] as const,
    lists: () => [...queryKeys.contracts.all, "list"] as const,
    list: (companyId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.contracts.lists(), companyId, filters] as const,
    details: () => [...queryKeys.contracts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
    templates: (companyId: string) =>
      [...queryKeys.contracts.all, "templates", companyId] as const,
    salaries: (companyId: string, status?: string) =>
      [...queryKeys.contracts.all, "salaries", companyId, status] as const,
    expiring: (companyId: string) =>
      [...queryKeys.contracts.all, "expiring", companyId] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Payments                                                          */
  /* ------------------------------------------------------------------ */
  payments: {
    all: ["payments"] as const,
    lists: () => [...queryKeys.payments.all, "list"] as const,
    list: (companyId: string) =>
      [...queryKeys.payments.lists(), companyId] as const,
    byUser: (userId: string) =>
      [...queryKeys.payments.all, "user", userId] as const,
    count: (companyId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.payments.all, "count", companyId, filters] as const,
    pending: (companyId?: string) =>
      [...queryKeys.payments.all, "pending", companyId] as const,
    overdue: (filters?: Record<string, unknown>) =>
      [...queryKeys.payments.all, "overdue", filters] as const,
    paidRange: (from: string, to: string, companyId?: string) =>
      [...queryKeys.payments.all, "paid-range", from, to, companyId] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Billings                                                          */
  /* ------------------------------------------------------------------ */
  billings: {
    all: ["billings"] as const,
    lists: () => [...queryKeys.billings.all, "list"] as const,
    list: (companyId?: string) =>
      [...queryKeys.billings.lists(), companyId] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Invites                                                           */
  /* ------------------------------------------------------------------ */
  invites: {
    all: ["invites"] as const,
    lists: () => [...queryKeys.invites.all, "list"] as const,
    list: (companyId: string) =>
      [...queryKeys.invites.lists(), companyId] as const,
    detail: (token: string) =>
      [...queryKeys.invites.all, "detail", token] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Notifications                                                     */
  /* ------------------------------------------------------------------ */
  notifications: {
    all: ["notifications"] as const,
    logs: (typeFilter?: string) =>
      [...queryKeys.notifications.all, "logs", typeFilter] as const,
    deliveryLogs: (notificationId: string) =>
      [...queryKeys.notifications.all, "delivery", notificationId] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Settings (system_settings + pricing / coupons / promotions)       */
  /* ------------------------------------------------------------------ */
  settings: {
    all: ["settings"] as const,
    setting: (key: string) => [...queryKeys.settings.all, key] as const,
    pricingTiers: () => [...queryKeys.settings.all, "pricing-tiers"] as const,
    coupons: () => [...queryKeys.settings.all, "coupons"] as const,
    promotions: () => [...queryKeys.settings.all, "promotions"] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Announcements                                                     */
  /* ------------------------------------------------------------------ */
  announcements: {
    all: ["announcements"] as const,
    active: () => [...queryKeys.announcements.all, "active"] as const,
    admin: () => [...queryKeys.announcements.all, "admin"] as const,
    reads: (userId: string) =>
      [...queryKeys.announcements.all, "reads", userId] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Dashboard overview stats                                          */
  /* ------------------------------------------------------------------ */
  dashboard: {
    all: ["dashboard"] as const,
    adminStats: (companyId: string) =>
      [...queryKeys.dashboard.all, "admin-stats", companyId] as const,
    colaboradorStats: (userId: string) =>
      [...queryKeys.dashboard.all, "colaborador-stats", userId] as const,
    sparkline: (companyId: string) =>
      [...queryKeys.dashboard.all, "sparkline", companyId] as const,
    alerts: (companyId: string) =>
      [...queryKeys.dashboard.all, "alerts", companyId] as const,
    health: (companyId: string) =>
      [...queryKeys.dashboard.all, "health", companyId] as const,
    recentActivity: (companyId: string) =>
      [...queryKeys.dashboard.all, "recent-activity", companyId] as const,
  },

  /* ------------------------------------------------------------------ */
  /*  Audit logs                                                        */
  /* ------------------------------------------------------------------ */
  audit: {
    all: ["audit"] as const,
    byCompany: (companyId: string) =>
      [...queryKeys.audit.all, companyId] as const,
  },
} as const;
