import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
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
    const email = args.email.toLowerCase().trim();
    const id = await ctx.db.insert("invitations", {
      companyId: args.companyId,
      email,
      role: args.role,
      status: "pending",
      invitedByUserId: args.invitedByUserId,
      expiresAt: Date.now() + thirtyDaysMs,
      createdAt: Date.now(),
      emailDeliveryStatus: "pending",
    });

    // Send invite email via Resend
    const company = await ctx.db.get(args.companyId);
    const inviterName = `${user.firstName} ${user.lastName}`;
    await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmailInternal, {
      invitationId: id,
      inviterName,
      companyName: company?.name ?? "CyberHook",
      inviteeEmail: email,
      role: args.role,
    });

    return id;
  },
});

// Internal mutation used by the email action to update delivery status.
export const updateEmailDeliveryStatus = internalMutation({
  args: {
    invitationId: v.id("invitations"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invitationId);
    if (!inv) return;
    await ctx.db.patch(args.invitationId, {
      emailDeliveryStatus: args.status,
      emailLastAttemptAt: Date.now(),
      emailError: args.error,
    });
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

export const resendInvitation = mutation({
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
      emailDeliveryStatus: "pending",
      emailError: undefined,
    });

    // Re-send invite email via Resend
    const company = await ctx.db.get(inv.companyId);
    const inviterName = `${user.firstName} ${user.lastName}`;
    await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmailInternal, {
      invitationId: args.id,
      inviterName,
      companyName: company?.name ?? "CyberHook",
      inviteeEmail: inv.email,
      role: inv.role,
    });

    return args.id;
  },
});
