import { describe, it, expect } from "vitest";
import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  /* ---------------------------------------------------------------- */
  /*  Companies                                                       */
  /* ---------------------------------------------------------------- */
  describe("companies", () => {
    it("all returns root key", () => {
      expect(queryKeys.companies.all).toEqual(["companies"]);
    });

    it("lists appends 'list'", () => {
      expect(queryKeys.companies.lists()).toEqual(["companies", "list"]);
    });

    it("list includes filters", () => {
      const key = queryKeys.companies.list({ active: true });
      expect(key).toEqual(["companies", "list", { active: true }]);
    });

    it("list without filters appends undefined", () => {
      const key = queryKeys.companies.list();
      expect(key).toEqual(["companies", "list", undefined]);
    });

    it("detail includes id", () => {
      expect(queryKeys.companies.detail("c-1")).toEqual([
        "companies",
        "detail",
        "c-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Profiles                                                        */
  /* ---------------------------------------------------------------- */
  describe("profiles", () => {
    it("all returns root key", () => {
      expect(queryKeys.profiles.all).toEqual(["profiles"]);
    });

    it("list includes companyId", () => {
      expect(queryKeys.profiles.list("c-1")).toEqual([
        "profiles",
        "list",
        "c-1",
        undefined,
      ]);
    });

    it("count includes companyId", () => {
      expect(queryKeys.profiles.count("c-1")).toEqual([
        "profiles",
        "count",
        "c-1",
      ]);
    });

    it("detail includes userId", () => {
      expect(queryKeys.profiles.detail("u-1")).toEqual([
        "profiles",
        "detail",
        "u-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Contracts                                                       */
  /* ---------------------------------------------------------------- */
  describe("contracts", () => {
    it("all returns root key", () => {
      expect(queryKeys.contracts.all).toEqual(["contracts"]);
    });

    it("list includes companyId and filters", () => {
      expect(queryKeys.contracts.list("c-1", { status: "active" })).toEqual([
        "contracts",
        "list",
        "c-1",
        { status: "active" },
      ]);
    });

    it("templates includes companyId", () => {
      expect(queryKeys.contracts.templates("c-1")).toEqual([
        "contracts",
        "templates",
        "c-1",
      ]);
    });

    it("salaries includes companyId and optional status", () => {
      expect(queryKeys.contracts.salaries("c-1", "PJ")).toEqual([
        "contracts",
        "salaries",
        "c-1",
        "PJ",
      ]);
    });

    it("expiring includes companyId", () => {
      expect(queryKeys.contracts.expiring("c-1")).toEqual([
        "contracts",
        "expiring",
        "c-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Payments                                                        */
  /* ---------------------------------------------------------------- */
  describe("payments", () => {
    it("all returns root key", () => {
      expect(queryKeys.payments.all).toEqual(["payments"]);
    });

    it("list includes companyId", () => {
      expect(queryKeys.payments.list("c-1")).toEqual([
        "payments",
        "list",
        "c-1",
      ]);
    });

    it("byUser includes userId", () => {
      expect(queryKeys.payments.byUser("u-1")).toEqual([
        "payments",
        "user",
        "u-1",
      ]);
    });

    it("pending includes optional companyId", () => {
      expect(queryKeys.payments.pending("c-1")).toEqual([
        "payments",
        "pending",
        "c-1",
      ]);
    });

    it("paidRange includes from/to/companyId", () => {
      expect(queryKeys.payments.paidRange("2025-01-01", "2025-01-31", "c-1")).toEqual([
        "payments",
        "paid-range",
        "2025-01-01",
        "2025-01-31",
        "c-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Billings                                                        */
  /* ---------------------------------------------------------------- */
  describe("billings", () => {
    it("all returns root key", () => {
      expect(queryKeys.billings.all).toEqual(["billings"]);
    });

    it("list includes optional companyId", () => {
      expect(queryKeys.billings.list("c-1")).toEqual([
        "billings",
        "list",
        "c-1",
      ]);
    });

    it("list without companyId works", () => {
      expect(queryKeys.billings.list()).toEqual([
        "billings",
        "list",
        undefined,
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Invites                                                         */
  /* ---------------------------------------------------------------- */
  describe("invites", () => {
    it("all returns root key", () => {
      expect(queryKeys.invites.all).toEqual(["invites"]);
    });

    it("list includes companyId", () => {
      expect(queryKeys.invites.list("c-1")).toEqual([
        "invites",
        "list",
        "c-1",
      ]);
    });

    it("detail includes token", () => {
      expect(queryKeys.invites.detail("tok-1")).toEqual([
        "invites",
        "detail",
        "tok-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Notifications                                                   */
  /* ---------------------------------------------------------------- */
  describe("notifications", () => {
    it("all returns root key", () => {
      expect(queryKeys.notifications.all).toEqual(["notifications"]);
    });

    it("logs includes optional typeFilter", () => {
      expect(queryKeys.notifications.logs("email")).toEqual([
        "notifications",
        "logs",
        "email",
      ]);
    });

    it("deliveryLogs includes notificationId", () => {
      expect(queryKeys.notifications.deliveryLogs("n-1")).toEqual([
        "notifications",
        "delivery",
        "n-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Settings                                                        */
  /* ---------------------------------------------------------------- */
  describe("settings", () => {
    it("all returns root key", () => {
      expect(queryKeys.settings.all).toEqual(["settings"]);
    });

    it("setting includes key", () => {
      expect(queryKeys.settings.setting("pj_contract_price")).toEqual([
        "settings",
        "pj_contract_price",
      ]);
    });

    it("pricingTiers includes segment", () => {
      expect(queryKeys.settings.pricingTiers()).toEqual([
        "settings",
        "pricing-tiers",
      ]);
    });

    it("coupons includes segment", () => {
      expect(queryKeys.settings.coupons()).toEqual(["settings", "coupons"]);
    });

    it("promotions includes segment", () => {
      expect(queryKeys.settings.promotions()).toEqual([
        "settings",
        "promotions",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Announcements                                                   */
  /* ---------------------------------------------------------------- */
  describe("announcements", () => {
    it("all returns root key", () => {
      expect(queryKeys.announcements.all).toEqual(["announcements"]);
    });

    it("active appends segment", () => {
      expect(queryKeys.announcements.active()).toEqual([
        "announcements",
        "active",
      ]);
    });

    it("admin appends segment", () => {
      expect(queryKeys.announcements.admin()).toEqual([
        "announcements",
        "admin",
      ]);
    });

    it("reads includes userId", () => {
      expect(queryKeys.announcements.reads("u-1")).toEqual([
        "announcements",
        "reads",
        "u-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Dashboard                                                       */
  /* ---------------------------------------------------------------- */
  describe("dashboard", () => {
    it("all returns root key", () => {
      expect(queryKeys.dashboard.all).toEqual(["dashboard"]);
    });

    it("adminStats includes companyId", () => {
      expect(queryKeys.dashboard.adminStats("c-1")).toEqual([
        "dashboard",
        "admin-stats",
        "c-1",
      ]);
    });

    it("colaboradorStats includes userId", () => {
      expect(queryKeys.dashboard.colaboradorStats("u-1")).toEqual([
        "dashboard",
        "colaborador-stats",
        "u-1",
      ]);
    });

    it("sparkline includes companyId", () => {
      expect(queryKeys.dashboard.sparkline("c-1")).toEqual([
        "dashboard",
        "sparkline",
        "c-1",
      ]);
    });

    it("recentActivity includes companyId", () => {
      expect(queryKeys.dashboard.recentActivity("c-1")).toEqual([
        "dashboard",
        "recent-activity",
        "c-1",
      ]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Audit                                                           */
  /* ---------------------------------------------------------------- */
  describe("audit", () => {
    it("all returns root key", () => {
      expect(queryKeys.audit.all).toEqual(["audit"]);
    });

    it("byCompany includes companyId", () => {
      expect(queryKeys.audit.byCompany("c-1")).toEqual(["audit", "c-1"]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Hierarchy — invalidation safety                                 */
  /* ---------------------------------------------------------------- */
  describe("invalidation hierarchy", () => {
    it("company detail starts with companies.all prefix", () => {
      const detail = queryKeys.companies.detail("c-1");
      expect(detail.slice(0, queryKeys.companies.all.length)).toEqual(
        queryKeys.companies.all,
      );
    });

    it("billing list starts with billings.all prefix", () => {
      const list = queryKeys.billings.list("c-1");
      expect(list.slice(0, queryKeys.billings.all.length)).toEqual(
        queryKeys.billings.all,
      );
    });

    it("invite list starts with invites.all prefix", () => {
      const list = queryKeys.invites.list("c-1");
      expect(list.slice(0, queryKeys.invites.all.length)).toEqual(
        queryKeys.invites.all,
      );
    });

    it("each domain has unique root key", () => {
      const roots = [
        queryKeys.companies.all[0],
        queryKeys.profiles.all[0],
        queryKeys.contracts.all[0],
        queryKeys.payments.all[0],
        queryKeys.billings.all[0],
        queryKeys.invites.all[0],
        queryKeys.notifications.all[0],
        queryKeys.settings.all[0],
        queryKeys.announcements.all[0],
        queryKeys.dashboard.all[0],
        queryKeys.audit.all[0],
      ];
      expect(new Set(roots).size).toBe(roots.length);
    });
  });
});
