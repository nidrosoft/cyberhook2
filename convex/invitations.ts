import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, assertCompanyAccess, requireRole } from "./lib/auth";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    assertCompanyAccess(user.companyId, args.companyId);

    return await ctx.db
      .query("invitations")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    invitedByUserId: v.id("users"),
    email: v.string(),
    role: v.union(v.literal("sales_rep"), v.literal("sales_admin"), v.literal("billing")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    assertCompanyAccess(user.companyId, args.companyId);
    if (user._id !== args.invitedByUserId) throw new Error("Forbidden: access denied");

    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    const active = existing.find(
      (inv) => inv.companyId === args.companyId && inv.status === "pending"
    );
    if (active) throw new Error("An invitation is already pending for this email");

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const id = await ctx.db.insert("invitations", {
      companyId: args.companyId,
      email: args.email.toLowerCase().trim(),
      role: args.role,
      status: "pending",
      invitedByUserId: args.invitedByUserId,
      expiresAt: Date.now() + thirtyDaysMs,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const cancel = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    const inv = await ctx.db.get(args.id);
    if (!inv) throw new Error("Invitation not found");
    assertCompanyAccess(user.companyId, inv.companyId);
    await ctx.db.patch(args.id, { status: "cancelled" });
    return args.id;
  },
});

export const resend = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    requireRole(user.role, "sales_admin");
    const inv = await ctx.db.get(args.id);
    if (!inv) throw new Error("Invitation not found");
    assertCompanyAccess(user.companyId, inv.companyId);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(args.id, {
      status: "pending",
      expiresAt: Date.now() + thirtyDaysMs,
    });
    return args.id;
  },
});
