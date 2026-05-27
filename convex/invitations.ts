import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth, assertCompanyAccess, requireRole } from "./lib/auth";
import { shouldAutoApprove } from "./lib/emailDomain";

// 32-char URL-safe token. ~190 bits of entropy — collision-resistant for
// the foreseeable lifetime of any tenant.
export function generateInviteToken(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    // Base64-url without padding
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

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
    const inviteToken = generateInviteToken();
    const id = await ctx.db.insert("invitations", {
      companyId: args.companyId,
      email,
      role: args.role,
      status: "pending",
      invitedByUserId: args.invitedByUserId,
      expiresAt: Date.now() + thirtyDaysMs,
      createdAt: Date.now(),
      emailDeliveryStatus: "pending",
      inviteToken,
    });

    const company = await ctx.db.get(args.companyId);
    const inviterName = `${user.firstName} ${user.lastName}`;
    await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmailInternal, {
      invitationId: id,
      inviterName,
      companyName: company?.name ?? "CyberHook AI",
      inviteeEmail: email,
      role: args.role,
      inviteToken,
    });

    return id;
  },
});

// ─── Accept-invite flow (Phase 3B) ──────────────────────────────────────────

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const inv = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("inviteToken", args.token))
      .first();
    if (!inv) return null;
    const company = await ctx.db.get(inv.companyId);
    const inviter = await ctx.db.get(inv.invitedByUserId);
    return {
      _id: inv._id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      companyId: inv.companyId,
      companyName: company?.name ?? null,
      inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : null,
    };
  },
});

/**
 * Accept an invitation. Called from the /accept-invite page after the user
 * has signed in via Clerk. The Clerk identity is the source of truth for the
 * accepting user's email and clerkId.
 *
 * Outcomes:
 *  - `already_member` — the user already has a record on this company.
 *  - `joined_approved` — same-domain, non-personal → user is active.
 *  - `joined_pending`  — different domain or personal-mail inviter → manual review.
 *
 * Idempotent: if the token has already been accepted, returns the existing user.
 */
export const acceptInvitation = mutation({
  args: { token: v.string() },
  returns: v.object({
    outcome: v.union(
      v.literal("already_member"),
      v.literal("joined_approved"),
      v.literal("joined_pending"),
    ),
    userId: v.id("users"),
    companyId: v.id("companies"),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized: please sign in to accept the invitation");
    const clerkId = identity.subject;
    const inviteeEmail = (identity.email ?? "").trim().toLowerCase();
    if (!inviteeEmail) throw new Error("Your account is missing an email address");

    const inv = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("inviteToken", args.token))
      .first();
    if (!inv) throw new Error("This invitation link is invalid or has been revoked");
    if (inv.status === "cancelled") throw new Error("This invitation was cancelled");
    if (inv.status === "expired" || inv.expiresAt < Date.now()) {
      throw new Error("This invitation has expired. Ask your administrator to resend it");
    }
    if (inv.email !== inviteeEmail) {
      throw new Error(
        `This invitation was sent to ${inv.email}. Please sign in with that email to accept it`,
      );
    }

    // Already accepted? Fast path: return the existing user.
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (existingUser && existingUser.companyId === inv.companyId) {
      return {
        outcome: "already_member" as const,
        userId: existingUser._id,
        companyId: inv.companyId,
      };
    }
    if (existingUser && existingUser.companyId !== inv.companyId) {
      throw new Error("Your account is already linked to a different company");
    }

    // Apply the domain-auto-approval rule.
    const inviter = await ctx.db.get(inv.invitedByUserId);
    const autoApprove = inviter ? shouldAutoApprove(inviter.email, inviteeEmail) : false;
    const newStatus: "approved" | "pending" = autoApprove ? "approved" : "pending";

    const firstName = (identity.givenName as string | undefined) ?? "";
    const lastName = (identity.familyName as string | undefined) ?? "";
    const imageUrl = (identity.pictureUrl as string | undefined) ?? undefined;
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId,
      email: inviteeEmail,
      firstName: firstName || inviteeEmail.split("@")[0],
      lastName,
      imageUrl,
      companyId: inv.companyId,
      role: inv.role,
      status: newStatus,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(inv._id, {
      status: "accepted",
      acceptedAt: now,
      acceptedByUserId: userId,
    });

    // Notify company sales_admins if manual review is required.
    if (!autoApprove) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAdminPendingApprovalEmailInternal, {
        companyId: inv.companyId,
        newUserId: userId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.emails.sendTeamMemberJoinedEmailInternal, {
        companyId: inv.companyId,
        newUserId: userId,
      });
    }

    return {
      outcome: autoApprove ? ("joined_approved" as const) : ("joined_pending" as const),
      userId,
      companyId: inv.companyId,
    };
  },
});

// Internal mutation used by the email action to update delivery status.
export const updateEmailDeliveryStatus = internalMutation({
  args: {
    invitationId: v.id("invitations"),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
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
    const inviteToken = inv.inviteToken ?? generateInviteToken();
    await ctx.db.patch(args.id, {
      status: "pending",
      expiresAt: Date.now() + thirtyDaysMs,
      emailDeliveryStatus: "pending",
      emailError: undefined,
      inviteToken,
    });

    const company = await ctx.db.get(inv.companyId);
    const inviterName = `${user.firstName} ${user.lastName}`;
    await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmailInternal, {
      invitationId: args.id,
      inviterName,
      companyName: company?.name ?? "CyberHook AI",
      inviteeEmail: inv.email,
      role: inv.role,
      inviteToken,
    });

    return args.id;
  },
});
