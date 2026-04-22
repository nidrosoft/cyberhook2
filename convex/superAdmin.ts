import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";

/**
 * Super-admin endpoints for CyberHook internal ops (blue item 1.4).
 *
 * Unlike `convex/users.ts` which enforces same-company access, these
 * endpoints deliberately read/write across every tenant — they power
 * the internal `/admin/pending-accounts` dashboard. Gating is done by
 * a hardcoded allow-list in the `SUPER_ADMIN_EMAILS` Convex env var
 * (comma-separated). If the var isn't set, these endpoints lock out
 * every caller (fail-closed).
 */

function superAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function requireSuperAdmin(ctx: any) {
  const user = await requireAuth(ctx);
  const allow = superAdminEmails();
  if (allow.length === 0 || !allow.includes(user.email.toLowerCase())) {
    throw new Error("Forbidden: super-admin access required");
  }
  return user;
}

/**
 * Write a platform-wide audit entry for a super-admin action. The
 * `auditLogs` table requires companyId + userId — we attribute the row
 * to the TARGET user's company so tenant admins see the trail in their
 * own settings audit view, and record the super-admin as the actor.
 */
async function writeAdminAudit(
  ctx: any,
  actor: { _id: any },
  action: string,
  target: { _id: any; companyId: any; email: string; firstName: string; lastName: string },
  details: string,
) {
  await ctx.db.insert("auditLogs", {
    companyId: target.companyId,
    userId: actor._id,
    action,
    entityType: "user",
    entityId: target._id,
    details,
    createdAt: Date.now(),
  });
}

/** Whoami helper — lets the admin page tell if the current user is cleared. */
export const isSuperAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return false;
    const allow = superAdminEmails();
    return allow.length > 0 && allow.includes(user.email.toLowerCase());
  },
});

/**
 * Cross-tenant list of every user currently in `pending` status, with
 * their company attached for context. Newest first so the review queue
 * shows the latest signups at the top.
 */
export const listPendingAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const pending = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    pending.sort((a, b) => b.createdAt - a.createdAt);

    const hydrated = await Promise.all(
      pending.map(async (u) => {
        const company = await ctx.db.get(u.companyId);
        return {
          _id: u._id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          createdAt: u.createdAt,
          company: company
            ? {
                _id: company._id,
                name: company.name,
                // Company uses `primaryBusinessModel` rather than `industry`
                // — surface it under the familiar key so the admin UI has
                // a single field to render.
                industry: company.primaryBusinessModel,
                planId: company.planId,
                status: company.status,
              }
            : null,
        };
      }),
    );
    return hydrated;
  },
});

/**
 * Cross-tenant approve — mirrors `users.approveUser` but skips the
 * same-company access check because super-admins operate above the
 * per-tenant boundary. Sends the standard approval email on success.
 */
export const approveAccount = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("User not found");

    await ctx.db.patch(args.id, { status: "approved", updatedAt: Date.now() });

    const company = await ctx.db.get(target.companyId);
    if (target.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendApprovalEmail, {
        email: target.email,
        firstName: target.firstName,
        companyName: company?.name ?? "CyberHook",
      });
    }
    await writeAdminAudit(
      ctx,
      admin,
      "user.approved",
      target,
      `Approved ${target.email} (${company?.name ?? ""})`,
    );
    return { success: true };
  },
});

/** Cross-tenant reject — mirrors `users.rejectUser`, same reasoning. */
export const rejectAccount = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("User not found");

    await ctx.db.patch(args.id, { status: "rejected", updatedAt: Date.now() });

    if (target.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendRejectionEmail, {
        email: target.email,
        firstName: target.firstName,
      });
    }
    await writeAdminAudit(
      ctx,
      admin,
      "user.rejected",
      target,
      `Rejected ${target.email}`,
    );
    return { success: true };
  },
});

/** Deactivate any user across any tenant. No email fires (internal admin action). */
export const deactivateAccount = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("User not found");
    await ctx.db.patch(args.id, { status: "deactivated", updatedAt: Date.now() });
    await writeAdminAudit(
      ctx,
      admin,
      "user.deactivated",
      target,
      `Deactivated ${target.email}`,
    );
    return { success: true };
  },
});

/** Reactivate a deactivated or rejected account back to approved. */
export const reactivateAccount = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx);
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("User not found");
    await ctx.db.patch(args.id, { status: "approved", updatedAt: Date.now() });
    // Reuse the existing user.approved action so it rolls up into the
    // same activity stream — details make the intent clear.
    await writeAdminAudit(
      ctx,
      admin,
      "user.approved",
      target,
      `Reactivated ${target.email}`,
    );
    return { success: true };
  },
});

/**
 * Platform-wide KPI snapshot for the super-admin header strip. Counts
 * are computed from a single full scan each (users + companies) — fine
 * for small / medium tenant counts; revisit with aggregates if the user
 * table grows past ~50k rows.
 */
export const platformMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const companies = await ctx.db.query("companies").collect();
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 3_600_000;

    const byStatus = { pending: 0, approved: 0, rejected: 0, deactivated: 0 };
    let newUsersLast7d = 0;
    for (const u of users) {
      byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
      if (u.createdAt >= sevenDaysAgo) newUsersLast7d += 1;
    }

    const byCompanyStatus: Record<string, number> = {};
    let newCompaniesLast7d = 0;
    for (const c of companies) {
      byCompanyStatus[c.status] = (byCompanyStatus[c.status] ?? 0) + 1;
      if (c.createdAt >= sevenDaysAgo) newCompaniesLast7d += 1;
    }

    return {
      totalUsers: users.length,
      totalCompanies: companies.length,
      userStatus: byStatus,
      companyStatus: byCompanyStatus,
      newUsersLast7d,
      newCompaniesLast7d,
    };
  },
});

/**
 * Cross-tenant user directory. Filter by status, search by name or
 * email (case-insensitive substring match on both the user and the
 * attached company). Capped at 200 rows — the UI paginates or narrows
 * via search rather than loading the whole table.
 */
export const listAllAccounts = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("deactivated"),
      ),
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const users = args.status
      ? await ctx.db
          .query("users")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("users").collect();
    users.sort((a, b) => b.createdAt - a.createdAt);

    const needle = args.search?.trim().toLowerCase();
    const companyCache = new Map<string, any>();

    const hydrated = await Promise.all(
      users.slice(0, 200).map(async (u) => {
        let company = companyCache.get(u.companyId);
        if (!company) {
          company = await ctx.db.get(u.companyId);
          companyCache.set(u.companyId, company);
        }
        return {
          _id: u._id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          lastAccessedAt: u.lastAccessedAt,
          company: company
            ? {
                _id: company._id,
                name: company.name,
                industry: company.primaryBusinessModel,
                planId: company.planId,
                status: company.status,
                country: company.country,
              }
            : null,
        };
      }),
    );

    if (!needle) return hydrated;
    return hydrated.filter((u) => {
      const hay = [
        u.email,
        u.firstName,
        u.lastName,
        u.company?.name,
        u.company?.industry,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  },
});

/**
 * Cross-tenant company directory — one row per company with user count
 * and roll-up status. Used for the "Companies" tab.
 */
export const listAllCompanies = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const companies = await ctx.db.query("companies").collect();
    companies.sort((a, b) => b.createdAt - a.createdAt);

    const hydrated = await Promise.all(
      companies.map(async (c) => {
        const users = await ctx.db
          .query("users")
          .withIndex("by_companyId", (q) => q.eq("companyId", c._id))
          .collect();
        const approved = users.filter((u) => u.status === "approved").length;
        const pending = users.filter((u) => u.status === "pending").length;
        return {
          _id: c._id,
          name: c.name,
          industry: c.primaryBusinessModel,
          country: c.country,
          status: c.status,
          planId: c.planId,
          trialEndsAt: c.trialEndsAt,
          totalEmployees: c.totalEmployees,
          annualRevenue: c.annualRevenue,
          createdAt: c.createdAt,
          redrokLinked: Boolean(c.redrokToken),
          userCount: users.length,
          approvedUsers: approved,
          pendingUsers: pending,
        };
      }),
    );

    const needle = args.search?.trim().toLowerCase();
    if (!needle) return hydrated;
    return hydrated.filter((c) =>
      [c.name, c.industry, c.country, c.planId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  },
});

/** Detailed view of a single company's users for the drawer. */
export const getCompanyDetail = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;
    const users = await ctx.db
      .query("users")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    users.sort((a, b) => a.createdAt - b.createdAt);
    return {
      company: {
        _id: company._id,
        name: company.name,
        industry: company.primaryBusinessModel,
        country: company.country,
        status: company.status,
        planId: company.planId,
        trialEndsAt: company.trialEndsAt,
        totalEmployees: company.totalEmployees,
        annualRevenue: company.annualRevenue,
        geographicCoverage: company.geographicCoverage,
        createdAt: company.createdAt,
        redrokLinked: Boolean(company.redrokToken),
      },
      users: users.map((u) => ({
        _id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastAccessedAt: u.lastAccessedAt,
      })),
    };
  },
});

/**
 * Recent platform-wide admin activity (approve / reject / deactivate
 * events) pulled from the existing `auditLogs` table. Used to render
 * the "Recent actions" ribbon on the admin console.
 */
export const recentAdminActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const actions = ["user.approved", "user.rejected", "user.deactivated"];
    const rows = (
      await Promise.all(
        actions.map((a) =>
          ctx.db
            .query("auditLogs")
            .withIndex("by_action", (q) => q.eq("action", a))
            .order("desc")
            .take(limit),
        ),
      )
    ).flat();
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows.slice(0, limit).map((r) => ({
      _id: r._id,
      action: r.action,
      entityId: r.entityId,
      details: r.details,
      createdAt: r.createdAt,
    }));
  },
});
