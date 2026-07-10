import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";

// The Convex Resend component QUEUES emails and submits them in batches to
// Resend's API. If Resend rejects a send (e.g. unverified From domain, rate
// limited, restricted API key) the batch worker records the failure on its
// own internal email row but our application never hears about it — which is
// why an invite can appear as "sent" in the UI while never reaching the
// recipient's inbox. We wire up an `onEmailEvent` callback so Resend's
// webhook deliveries flow back to us and we can update our own delivery
// status fields in real time. The webhook endpoint is mounted in
// `convex/http.ts`; the user must add the webhook URL in the Resend
// dashboard and set `RESEND_WEBHOOK_SECRET`.
export const resend: Resend = new Resend(components.resend, {
  testMode: false,
  onEmailEvent: internal.emails.handleResendEmailEvent,
});

// Sandbox switch.
//
// Set the Convex env var `RESEND_USE_SANDBOX_DOMAIN=true` while you're
// waiting for `cyberhook.ai` to be verified at https://resend.com/domains.
// While enabled we send every message FROM `onboarding@resend.dev` (Resend's
// always-allowed test address) so the queue isn't 403'd for "domain not
// verified". Note: in sandbox mode Resend will only deliver to the verified
// account owner; everyone else gets rejected with a clear error and the
// invite shows as "failed" in the team page — which is exactly the visibility
// we want until the production domain is verified.
const USE_SANDBOX_FROM = process.env.RESEND_USE_SANDBOX_DOMAIN === "true";
const SANDBOX_FROM = "CyberHook AI <onboarding@resend.dev>";

// Production FROM addresses. Once cyberhook.ai is verified in Resend, this is
// what every transactional email is sent from. Each can be overridden via
// env vars, but the override must still live on a verified domain — anything
// else is silently coerced back to the cyberhook.ai default by
// `enforceCyberhookDomain` to avoid an invisible 403 on send.
function enforceCyberhookDomain(emailStr: string | undefined, defaultEmail: string): string {
  if (!emailStr) return defaultEmail;
  if (!emailStr.includes("@cyberhook.ai")) {
    return defaultEmail;
  }
  return emailStr;
}

const FROM_NOREPLY = USE_SANDBOX_FROM
  ? SANDBOX_FROM
  : enforceCyberhookDomain(process.env.EMAIL_FROM_NOREPLY, "CyberHook AI <noreply@cyberhook.ai>");
const FROM_TEAM = USE_SANDBOX_FROM
  ? SANDBOX_FROM
  : enforceCyberhookDomain(process.env.EMAIL_FROM_TEAM, "CyberHook AI Team <team@cyberhook.ai>");
const FROM_INVITE = USE_SANDBOX_FROM
  ? SANDBOX_FROM
  : enforceCyberhookDomain(process.env.EMAIL_FROM_INVITE, "CyberHook AI Invites <invites@cyberhook.ai>");
const FROM_SUPPORT = USE_SANDBOX_FROM
  ? SANDBOX_FROM
  : enforceCyberhookDomain(process.env.EMAIL_FROM_SUPPORT, "CyberHook AI Support <support@cyberhook.ai>");

// Production-deployed app URL. Override via Convex env `SITE_URL` for staging,
// local dev, or domain changes. Falls back to the production host.
const SITE_URL = process.env.SITE_URL ?? "https://app.cyberhook.ai";

const TERMS_URL = "https://cyberhook.ai/terms-and-conditions";
const PRIVACY_URL = "https://cyberhook.ai/privacy-policy";

// ─── Email Templates ─────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="padding:32px 32px 0;">
      <!-- Text wordmark instead of a hosted image: many clients block remote
           images by default, and the marketing site has no logo.png asset, so
           a styled text mark renders reliably everywhere. -->
      <div style="margin-bottom:24px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#7c3aed;">CyberHook<span style="color:#111827;">&nbsp;AI</span></div>
    </div>
    <div style="padding:0 32px 32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        © ${new Date().getFullYear()} CyberHook AI &middot; Dark Web Intelligence Platform
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
        <a href="https://cyberhook.ai" style="color:#6b7280;text-decoration:none;">cyberhook.ai</a>
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
        <a href="${TERMS_URL}" style="color:#9ca3af;text-decoration:underline;">Terms &amp; Conditions</a>
        &nbsp;&middot;&nbsp;
        <a href="${PRIVACY_URL}" style="color:#9ca3af;text-decoration:underline;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function inviteEmailTemplate(args: {
  inviterName: string;
  companyName: string;
  inviteeEmail: string;
  role: string;
  signUpUrl: string;
}): { subject: string; html: string } {
  const roleDisplay = args.role === "sales_admin" ? "Sales Admin" : args.role === "billing" ? "Billing" : "Sales Rep";
  return {
    subject: `${args.inviterName} invited you to join ${args.companyName} on CyberHook AI`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">You've been invited!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        <strong style="color:#111827;">${args.inviterName}</strong> has invited you to join 
        <strong style="color:#111827;">${args.companyName}</strong> on CyberHook AI as a <strong style="color:#111827;">${roleDisplay}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        CyberHook AI is a dark web intelligence platform that helps cybersecurity firms find, engage, and convert leads through AI-powered outreach.
      </p>
      <a href="${args.signUpUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Accept Invitation
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
        This invitation was sent to ${args.inviteeEmail}. If you weren't expecting this, you can safely ignore it.
      </p>
    `),
  };
}

function welcomeEmailTemplate(args: {
  firstName: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `Welcome to CyberHook AI, ${args.firstName}!`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Welcome aboard, ${args.firstName}!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Your account for <strong style="color:#111827;">${args.companyName}</strong> has been created on CyberHook AI. 
        Your account is being reviewed by our team and you'll receive a notification once approved.
      </p>
      <div style="padding:16px;background:#f3f4f6;border-radius:8px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">What happens next?</p>
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#6b7280;line-height:1.8;">
          <li>Our team reviews your account (typically 24-48 hours)</li>
          <li>You'll receive an email once approved</li>
          <li>Start leveraging dark web intelligence for your sales pipeline</li>
        </ul>
      </div>
      <a href="https://app.cyberhook.ai" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Go to Dashboard
      </a>
    `),
  };
}

function approvalEmailTemplate(args: {
  firstName: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `Your CyberHook AI account has been approved!`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">You're approved! 🎉</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Great news, <strong style="color:#111827;">${args.firstName}</strong>! Your account for 
        <strong style="color:#111827;">${args.companyName}</strong> has been approved. You now have full access to CyberHook AI.
      </p>
      <div style="padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#065f46;">Your account is now active</p>
        <p style="margin:4px 0 0;font-size:13px;color:#047857;">All features are unlocked and ready to use.</p>
      </div>
      <a href="https://app.cyberhook.ai/dashboard" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Start Using CyberHook AI
      </a>
    `),
  };
}

function rejectionEmailTemplate(args: {
  firstName: string;
}): { subject: string; html: string } {
  return {
    subject: `Update on your CyberHook AI account application`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Account Application Update</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${args.firstName}, thank you for your interest in CyberHook AI. After reviewing your application, 
        we're unable to approve your account at this time.
      </p>
      <div style="padding:16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">Why was my application declined?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#a16207;">
          CyberHook AI provides access to sensitive dark web intelligence. We carefully verify all accounts to 
          ensure responsible use and compliance with our terms of service.
        </p>
      </div>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
        If you believe this was an error, you can appeal by contacting us at 
        <a href="mailto:support@cyberhook.ai" style="color:#7c3aed;">support@cyberhook.ai</a>.
      </p>
    `),
  };
}

function adminPendingApprovalEmailTemplate(args: {
  adminFirstName: string;
  inviteeEmail: string;
  inviterName: string | null;
  companyName: string;
  reviewUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `A new ${args.companyName} user is awaiting your approval`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">A user is awaiting approval</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${args.adminFirstName || "there"},
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        <strong style="color:#111827;">${args.inviteeEmail}</strong> just joined <strong style="color:#111827;">${args.companyName}</strong> on CyberHook AI${args.inviterName ? ` (invited by ${args.inviterName})` : ""} and needs admin approval before they can access the dashboard.
      </p>
      <div style="padding:16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">Why am I receiving this?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#a16207;">
          The invitee's email domain doesn't match the inviter's, so CyberHook AI is asking a Sales Admin to review the request before granting access.
        </p>
      </div>
      <a href="${args.reviewUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Review request
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
        You're receiving this because you're a Sales Admin on ${args.companyName}. You can disable these emails in Settings → My details.
      </p>
    `),
  };
}

function redrokHealthEmailTemplate(args: {
  firstName: string;
  companyName: string;
  status: "unhealthy" | "recovered";
  settingsUrl: string;
  errorCode?: string;
}): { subject: string; html: string } {
  const recovered = args.status === "recovered";
  const heading = recovered ? "Redrok integration recovered" : "Redrok integration needs attention";
  const description = recovered
    ? `CyberHook AI can connect to Redrok again for ${args.companyName}. Live credential-exposure searches are available.`
    : `CyberHook AI could not verify the Redrok integration for ${args.companyName}. Review the integration settings to restore live credential-exposure searches.`;
  const diagnostic = !recovered && args.errorCode
    ? `<p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Diagnostic code: <strong>${args.errorCode}</strong></p>`
    : "";

  return {
    subject: recovered
      ? `Redrok integration recovered for ${args.companyName}`
      : `Action needed: Redrok integration for ${args.companyName}`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">${heading}</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">Hi ${args.firstName || "there"},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">${description}</p>
      ${diagnostic}
      <a href="${args.settingsUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Review integration settings
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
        You're receiving this because you're an approved Sales Admin. You can disable these emails in Settings → My details.
      </p>
    `),
  };
}

function passwordResetEmailTemplate(args: {
  firstName: string;
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Reset your CyberHook AI password`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Password Reset</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${args.firstName}, we received a request to reset your CyberHook AI password. 
        Click the button below to create a new password.
      </p>
      <a href="${args.resetUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Reset Password
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    `),
  };
}

// ─── Internal Actions (scheduled from mutations) ─────────────────────────────

export const sendInviteEmailInternal = internalAction({
  args: {
    invitationId: v.optional(v.id("invitations")),
    inviterName: v.string(),
    companyName: v.string(),
    inviteeEmail: v.string(),
    role: v.string(),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Prefer the tokenized accept-invite URL when we have a token. Fallback
    // to the legacy `?invite=<email>` query for rows created pre-Phase 3
    // (the home page also recognises the old style and redirects).
    const signUpUrl = args.inviteToken
      ? `${SITE_URL}/accept-invite?token=${encodeURIComponent(args.inviteToken)}`
      : `${SITE_URL}?invite=${encodeURIComponent(args.inviteeEmail)}`;
    const { subject, html } = inviteEmailTemplate({
      inviterName: args.inviterName,
      companyName: args.companyName,
      inviteeEmail: args.inviteeEmail,
      role: args.role,
      signUpUrl,
    });

    try {
      await resend.sendEmail(ctx, {
        from: FROM_INVITE,
        to: args.inviteeEmail,
        subject,
        html,
      });
      if (args.invitationId) {
        await ctx.runMutation(internal.invitations.updateEmailDeliveryStatus, {
          invitationId: args.invitationId,
          status: "sent",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error sending invite email";
      console.error("[sendInviteEmailInternal] failed:", message);
      if (args.invitationId) {
        await ctx.runMutation(internal.invitations.updateEmailDeliveryStatus, {
          invitationId: args.invitationId,
          status: "failed",
          error: message,
        });
      }
      throw err;
    }
  },
});

// ─── Public Actions ──────────────────────────────────────────────────────────

export const sendInviteEmail = action({
  args: {
    inviterName: v.string(),
    companyName: v.string(),
    inviteeEmail: v.string(),
    role: v.string(),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const signUpUrl = args.inviteToken
      ? `${SITE_URL}/accept-invite?token=${encodeURIComponent(args.inviteToken)}`
      : `${SITE_URL}?invite=${encodeURIComponent(args.inviteeEmail)}`;
    const { subject, html } = inviteEmailTemplate({
      inviterName: args.inviterName,
      companyName: args.companyName,
      inviteeEmail: args.inviteeEmail,
      role: args.role,
      signUpUrl,
    });

    await resend.sendEmail(ctx, {
      from: FROM_INVITE,
      to: args.inviteeEmail,
      subject,
      html,
    });

    return { success: true };
  },
});

// ─── Internal Actions (called from other backend mutations) ──────────────────

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = welcomeEmailTemplate({
      firstName: args.firstName,
      companyName: args.companyName,
    });

    await resend.sendEmail(ctx, {
      from: FROM_NOREPLY,
      to: args.email,
      subject,
      html,
    });
  },
});

export const sendApprovalEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = approvalEmailTemplate({
      firstName: args.firstName,
      companyName: args.companyName,
    });

    await resend.sendEmail(ctx, {
      from: FROM_TEAM,
      to: args.email,
      subject,
      html,
    });
  },
});

export const sendRejectionEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = rejectionEmailTemplate({
      firstName: args.firstName,
    });

    await resend.sendEmail(ctx, {
      from: FROM_NOREPLY,
      to: args.email,
      subject,
      html,
    });
  },
});

// ─── Phase 3D: Admin pending-approval notifications ──────────────────────────

/**
 * Internal query used by the admin-pending-approval email action to fetch
 * recipients without doing DB work from inside the action context.
 */
export const getAdminApprovalRecipients = internalQuery({
  args: { companyId: v.id("companies"), newUserId: v.id("users") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    const newUser = await ctx.db.get(args.newUserId);
    if (!company || !newUser) return null;

    const admins = await ctx.db
      .query("users")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    const recipients = admins
      .filter(
        (u) =>
          (u.role === "sales_admin" || u.role === "super_admin") &&
          u.status === "approved" &&
          // Respect per-user email-notification preference (default true).
          u.emailNotifications !== false &&
          u._id !== args.newUserId,
      )
      .map((u) => ({ email: u.email, firstName: u.firstName }));

    let inviterName: string | null = null;
    const lastInvite = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", newUser.email))
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .order("desc")
      .first();
    if (lastInvite) {
      const inviter = await ctx.db.get(lastInvite.invitedByUserId);
      if (inviter) inviterName = `${inviter.firstName} ${inviter.lastName}`.trim();
    }

    return {
      companyName: company.name ?? "your company",
      inviteeEmail: newUser.email,
      inviterName,
      recipients,
    };
  },
});

export const sendAdminPendingApprovalEmailInternal = internalAction({
  args: {
    companyId: v.id("companies"),
    newUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ sent: number }> => {
    const data: {
      companyName: string;
      inviteeEmail: string;
      inviterName: string | null;
      recipients: Array<{ email: string; firstName: string }>;
    } | null = await ctx.runQuery(internal.emails.getAdminApprovalRecipients, {
      companyId: args.companyId,
      newUserId: args.newUserId,
    });
    if (!data || data.recipients.length === 0) return { sent: 0 };

    const reviewUrl = `${SITE_URL}/settings?tab=team`;
    let sent = 0;
    for (const r of data.recipients) {
      const { subject, html } = adminPendingApprovalEmailTemplate({
        adminFirstName: r.firstName,
        inviteeEmail: data.inviteeEmail,
        inviterName: data.inviterName,
        companyName: data.companyName,
        reviewUrl,
      });
      try {
        await resend.sendEmail(ctx, {
          from: FROM_TEAM,
          to: r.email,
          subject,
          html,
        });
        sent += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error(`[sendAdminPendingApprovalEmail] failed for ${r.email}:`, message);
      }
    }
    return { sent };
  },
});

export const getRedrokHealthAlertRecipients = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;

    const users = await ctx.db
      .query("users")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    return {
      companyName: company.name ?? "your company",
      recipients: users
        .filter(
          (user) =>
            user.role === "sales_admin" &&
            user.status === "approved" &&
            user.emailNotifications !== false,
        )
        .map((user) => ({ email: user.email, firstName: user.firstName })),
    };
  },
});

export const sendRedrokHealthAlertInternal = internalAction({
  args: {
    companyId: v.id("companies"),
    status: v.union(v.literal("unhealthy"), v.literal("recovered")),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ sent: number }> => {
    const data: {
      companyName: string;
      recipients: Array<{ email: string; firstName: string }>;
    } | null = await ctx.runQuery(internal.emails.getRedrokHealthAlertRecipients, {
      companyId: args.companyId,
    });
    if (!data) return { sent: 0 };

    const settingsUrl = `${SITE_URL}/settings?tab=integrations`;
    let sent = 0;
    for (const recipient of data.recipients) {
      const { subject, html } = redrokHealthEmailTemplate({
        firstName: recipient.firstName,
        companyName: data.companyName,
        status: args.status,
        settingsUrl,
        errorCode: args.errorCode,
      });
      try {
        await resend.sendEmail(ctx, {
          from: FROM_TEAM,
          to: recipient.email,
          subject,
          html,
        });
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        console.error(`[sendRedrokHealthAlertInternal] failed for ${recipient.email}:`, message);
      }
    }
    return { sent };
  },
});

/**
 * Notify CyberHook AI platform super-admins (configured via the
 * `SUPER_ADMIN_EMAILS` Convex env, comma-separated) that a brand-new company
 * just completed onboarding and is waiting for platform-level approval.
 */
export const sendNewCompanyPendingEmailInternal = internalAction({
  args: {
    companyId: v.id("companies"),
    newUserId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ sent: number }> => {
    const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
    const recipients = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("@"));
    if (recipients.length === 0) {
      console.warn("[sendNewCompanyPendingEmailInternal] SUPER_ADMIN_EMAILS is empty; skipping");
      return { sent: 0 };
    }

    const data: {
      companyName: string;
      newUserEmail: string;
      newUserName: string;
    } | null = await ctx.runQuery(internal.emails.getNewCompanyContext, {
      companyId: args.companyId,
      newUserId: args.newUserId,
    });
    if (!data) return { sent: 0 };

    const reviewUrl = `${SITE_URL}/admin/pending-accounts`;
    const subject = `New CyberHook AI signup awaiting approval: ${data.companyName}`;
    const html = baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">New company awaiting approval</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
        <strong style="color:#111827;">${data.newUserName}</strong> (${data.newUserEmail}) just signed up on behalf of
        <strong style="color:#111827;">${data.companyName}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        Review the application in the platform admin console before granting access.
      </p>
      <a href="${reviewUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Open Pending Accounts
      </a>
    `);

    let sent = 0;
    for (const to of recipients) {
      try {
        await resend.sendEmail(ctx, { from: FROM_TEAM, to, subject, html });
        sent += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error(`[sendNewCompanyPendingEmailInternal] failed for ${to}:`, message);
      }
    }
    return { sent };
  },
});

export const getNewCompanyContext = internalQuery({
  args: { companyId: v.id("companies"), newUserId: v.id("users") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    const user = await ctx.db.get(args.newUserId);
    if (!company || !user) return null;
    return {
      companyName: company.name ?? "Unnamed company",
      newUserEmail: user.email,
      newUserName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    };
  },
});

export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    resetUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = passwordResetEmailTemplate({
      firstName: args.firstName,
      resetUrl: args.resetUrl,
    });

    await resend.sendEmail(ctx, {
      from: FROM_NOREPLY,
      to: args.email,
      subject,
      html,
    });
  },
});

// ─── Team / Invite / Support Email Additions ─────────────────────────────────

// 1. Support templates & actions
function supportRequestEmailTemplate(args: {
  userName: string;
  userEmail: string;
  companyName: string;
  subject: string;
  message: string;
}): { subject: string; html: string } {
  return {
    subject: `Support Request: ${args.subject} (from ${args.companyName})`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">New Support Request</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">
        A support request has been submitted by <strong style="color:#111827;">${args.userName}</strong> 
        (<a href="mailto:${args.userEmail}" style="color:#7c3aed;">${args.userEmail}</a>) from 
        <strong style="color:#111827;">${args.companyName}</strong>.
      </p>
      <div style="padding:16px;background:#f3f4f6;border-radius:8px;margin:0 0 24px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">Subject</p>
        <p style="margin:0 0 16px;font-size:14px;color:#374151;">${args.subject}</p>
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">Message</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${args.message}</p>
      </div>
    `),
  };
}

function supportConfirmationEmailTemplate(args: {
  userName: string;
  subject: string;
}): { subject: string; html: string } {
  return {
    subject: `We've received your support request: ${args.subject}`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">We're on it!</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;">
        Hi ${args.userName}, we've received your support request regarding <strong style="color:#111827;">${args.subject}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
        Our team is reviewing the details and we'll get back to you as soon as possible. Most support tickets are resolved within 24 hours.
      </p>
      <div style="padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#065f46;">No further action needed</p>
        <p style="margin:4px 0 0;font-size:13px;color:#047857;">If you have any additional information to add, simply reply to this email.</p>
      </div>
    `),
  };
}

export const submitSupportRequest = action({
  args: {
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized: please sign in to contact support");

    const userContext = await ctx.runQuery(internal.emails.getUserSupportContext, { clerkId: identity.subject });
    if (!userContext) throw new Error("User profile not found");

    const { userEmail, userName, companyName } = userContext;

    // Send the ticket forward to our support inbox
    const supportRequest = supportRequestEmailTemplate({
      userName,
      userEmail,
      companyName,
      subject: args.subject,
      message: args.message,
    });

    await resend.sendEmail(ctx, {
      from: FROM_SUPPORT,
      to: "support@cyberhook.ai",
      subject: supportRequest.subject,
      html: supportRequest.html,
    });

    // Send confirmation to the user
    const confirmation = supportConfirmationEmailTemplate({
      userName,
      subject: args.subject,
    });

    await resend.sendEmail(ctx, {
      from: FROM_SUPPORT,
      to: userEmail,
      subject: confirmation.subject,
      html: confirmation.html,
    });

    return { success: true };
  },
});

export const getUserSupportContext = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;
    const company = await ctx.db.get(user.companyId);
    return {
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      companyName: company?.name ?? "CyberHook AI Customer",
    };
  },
});

// 2. Team role update templates & actions
function roleUpdateEmailTemplate(args: {
  firstName: string;
  companyName: string;
  newRoleDisplay: string;
}): { subject: string; html: string } {
  return {
    subject: `Your role has been updated on CyberHook AI`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Role Updated</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
        Hi ${args.firstName}, your access role on <strong style="color:#111827;">${args.companyName}</strong> has been updated to <strong style="color:#111827;">${args.newRoleDisplay}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        If this change was unexpected, please contact your company administrator.
      </p>
      <a href="${SITE_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Go to Dashboard
      </a>
    `),
  };
}

export const sendRoleUpdateEmailInternal = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    companyName: v.string(),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const roleDisplay = args.newRole === "sales_admin" ? "Sales Admin" : args.newRole === "billing" ? "Billing" : "Sales Rep";
    const { subject, html } = roleUpdateEmailTemplate({
      firstName: args.firstName,
      companyName: args.companyName,
      newRoleDisplay: roleDisplay,
    });

    await resend.sendEmail(ctx, {
      from: FROM_TEAM,
      to: args.email,
      subject,
      html,
    });
  },
});

// 3. User deactivated templates & actions
function userDeactivatedEmailTemplate(args: {
  firstName: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `Your CyberHook AI account has been deactivated`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Account Deactivated</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
        Hi ${args.firstName}, your account on <strong style="color:#111827;">${args.companyName}</strong> has been deactivated by your administrator.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        You no longer have access to the CyberHook AI dashboard. If you believe this was an error, please contact your company administrator.
      </p>
    `),
  };
}

export const sendUserDeactivatedEmailInternal = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = userDeactivatedEmailTemplate({
      firstName: args.firstName,
      companyName: args.companyName,
    });

    await resend.sendEmail(ctx, {
      from: FROM_TEAM,
      to: args.email,
      subject,
      html,
    });
  },
});

// 4. Team member joined templates & actions
function teamMemberJoinedEmailTemplate(args: {
  adminFirstName: string;
  newUserName: string;
  newUserEmail: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `${args.newUserName} has joined ${args.companyName} on CyberHook AI`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">New team member joined</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${args.adminFirstName},
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        <strong style="color:#111827;">${args.newUserName}</strong> (${args.newUserEmail}) has accepted their invitation and joined your team on CyberHook AI.
      </p>
      <a href="${SITE_URL}/settings?tab=team" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Manage Team
      </a>
    `),
  };
}

export const sendTeamMemberJoinedEmailInternal = internalAction({
  args: {
    companyId: v.id("companies"),
    newUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.emails.getAdminApprovalRecipients, {
      companyId: args.companyId,
      newUserId: args.newUserId,
    });
    if (!data || data.recipients.length === 0) return { sent: 0 };

    const newUser = await ctx.runQuery(internal.users.internalGetById, { id: args.newUserId });
    const newUserName = newUser ? `${newUser.firstName} ${newUser.lastName}`.trim() || newUser.email : data.inviteeEmail;

    let sent = 0;
    for (const r of data.recipients) {
      const { subject, html } = teamMemberJoinedEmailTemplate({
        adminFirstName: r.firstName,
        newUserName,
        newUserEmail: data.inviteeEmail,
        companyName: data.companyName,
      });
      try {
        await resend.sendEmail(ctx, {
          from: FROM_TEAM,
          to: r.email,
          subject,
          html,
        });
        sent += 1;
      } catch (err) {
        console.error(`[sendTeamMemberJoinedEmail] failed for ${r.email}:`, err);
      }
    }
    return { sent };
  },
});

// ─── Resend webhook + delivery-status reconciliation ─────────────────────────

/**
 * Called by the @convex-dev/resend component whenever Resend reports a
 * lifecycle event for an email we sent: queued, sent, delivered, bounced,
 * complained, opened, clicked, delivery_delayed, failed. We use it to mark
 * the originating invitation row with the *real* delivery status so the
 * Sales Admin can see whether the invite actually reached the recipient
 * (vs being silently rejected by Resend because the From domain isn't
 * verified, the recipient is outside test mode, etc.).
 */
export const handleResendEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: async (ctx, args) => {
    const eventType = args.event.type;
    console.log(`[resend.onEmailEvent] ${eventType} for emailId=${args.id}`);

    // We need the actual recipient address to find the matching invitation
    // row (the Resend component stores it internally; we read it back here).
    let recipient: string | null = null;
    let errorMessage: string | undefined;
    const ev = args.event as Record<string, unknown>;
    const data = (ev.data ?? {}) as Record<string, unknown>;
    if (Array.isArray(data.to) && data.to.length > 0) {
      recipient = String(data.to[0]).toLowerCase();
    }
    if (eventType === "email.bounced") {
      const bounce = (data.bounce ?? {}) as Record<string, unknown>;
      errorMessage = typeof bounce.message === "string" ? bounce.message : "Bounced";
    } else if (eventType === "email.failed") {
      const failed = (data.failed ?? {}) as Record<string, unknown>;
      errorMessage = typeof failed.reason === "string" ? failed.reason : "Send failed";
    } else if (eventType === "email.complained") {
      errorMessage = "Recipient marked the message as spam";
    }

    if (!recipient) return;

    // Match the most recent invitation for this recipient (case-insensitive).
    const inv = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", recipient!))
      .order("desc")
      .first();
    if (!inv) return;

    // Map Resend event to our coarse-grained delivery status.
    let newStatus: "sent" | "delivered" | "failed" | null = null;
    if (eventType === "email.delivered") newStatus = "delivered";
    else if (eventType === "email.sent") newStatus = "sent";
    else if (
      eventType === "email.bounced" ||
      eventType === "email.complained" ||
      eventType === "email.failed"
    )
      newStatus = "failed";

    if (newStatus) {
      await ctx.db.patch(inv._id, {
        emailDeliveryStatus: newStatus,
        emailLastAttemptAt: Date.now(),
        ...(errorMessage ? { emailError: errorMessage } : {}),
      });
    }
  },
});

/**
 * Lightweight health-check action used by the platform admins to verify
 * that Resend is wired up correctly: returns whether the API key is set,
 * what the configured FROM addresses look like, and whether the most
 * recent invite for an email actually got accepted by Resend.
 */
export const resendHealthCheck = internalQuery({
  args: { recipientEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const apiKeyPresent = !!process.env.RESEND_API_KEY;
    const webhookSecretPresent = !!process.env.RESEND_WEBHOOK_SECRET;
    const sandboxMode = process.env.RESEND_USE_SANDBOX_DOMAIN === "true";
    let lastInvite = null;
    if (args.recipientEmail) {
      const r = args.recipientEmail.trim().toLowerCase();
      lastInvite = await ctx.db
        .query("invitations")
        .withIndex("by_email", (q) => q.eq("email", r))
        .order("desc")
        .first();
    }
    return {
      apiKeyPresent,
      webhookSecretPresent,
      sandboxMode,
      fromAddresses: { FROM_NOREPLY, FROM_TEAM, FROM_INVITE, FROM_SUPPORT },
      siteUrl: SITE_URL,
      lastInvite,
    };
  },
});

/**
 * Direct end-to-end test of the Resend pipeline. Sends a real email via the
 * Convex Resend component and reports the queued emailId + immediate status
 * snapshot. Use to verify that the FROM domain is verified and the API key
 * is valid without going through the full invite flow. The email is
 * dispatched FROM whatever the current `FROM_NOREPLY` resolves to (which
 * respects sandbox mode).
 */
export const resendDirectTest = internalAction({
  args: { to: v.string(), subject: v.optional(v.string()) },
  handler: async (
    ctx,
    args,
  ): Promise<{ emailId: string; from: string; to: string; initialStatus: unknown }> => {
    const subject = args.subject ?? "CyberHook delivery test";
    const html = `<p>This is a deliverability check from CyberHook (${new Date().toISOString()}).</p><p>If you see this in your inbox, the @convex-dev/resend pipeline is wired correctly.</p>`;
    const emailId = await resend.sendEmail(ctx, {
      from: FROM_NOREPLY,
      to: args.to,
      subject,
      html,
    });
    // Poll the component for up to 20s waiting for the batch worker to
    // pick up the email and deliver/fail it. This is much more useful than
    // returning "queued" — we want to know whether Resend accepted the send.
    let initialStatus: unknown = null;
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      const s = await resend.status(ctx, emailId);
      initialStatus = s;
      if (s && (s.status === "sent" || s.failed || s.bounced)) break;
    }
    return { emailId, from: FROM_NOREPLY, to: args.to, initialStatus };
  },
});
