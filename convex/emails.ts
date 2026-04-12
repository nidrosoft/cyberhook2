import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";

const resend = new Resend(components.resend, { testMode: false });

const FROM_NOREPLY = "CyberHook <noreply@cyberhook.ai>";
const FROM_TEAM = "CyberHook Team <team@cyberhook.ai>";

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
      <img src="https://cyberhook.ai/logo.png" alt="CyberHook" height="28" style="display:block;margin-bottom:24px;" />
    </div>
    <div style="padding:0 32px 32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        © ${new Date().getFullYear()} CyberHook &middot; Dark Web Intelligence Platform
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
        <a href="https://cyberhook.ai" style="color:#6b7280;text-decoration:none;">cyberhook.ai</a>
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
    subject: `${args.inviterName} invited you to join ${args.companyName} on CyberHook`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">You've been invited!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        <strong style="color:#111827;">${args.inviterName}</strong> has invited you to join 
        <strong style="color:#111827;">${args.companyName}</strong> on CyberHook as a <strong style="color:#111827;">${roleDisplay}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        CyberHook is a dark web intelligence platform that helps cybersecurity firms find, engage, and convert leads through AI-powered outreach.
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
    subject: `Welcome to CyberHook, ${args.firstName}!`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Welcome aboard, ${args.firstName}!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Your account for <strong style="color:#111827;">${args.companyName}</strong> has been created on CyberHook. 
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
    subject: `Your CyberHook account has been approved!`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">You're approved! 🎉</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Great news, <strong style="color:#111827;">${args.firstName}</strong>! Your account for 
        <strong style="color:#111827;">${args.companyName}</strong> has been approved. You now have full access to CyberHook.
      </p>
      <div style="padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#065f46;">Your account is now active</p>
        <p style="margin:4px 0 0;font-size:13px;color:#047857;">All features are unlocked and ready to use.</p>
      </div>
      <a href="https://app.cyberhook.ai/dashboard" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Start Using CyberHook
      </a>
    `),
  };
}

function rejectionEmailTemplate(args: {
  firstName: string;
}): { subject: string; html: string } {
  return {
    subject: `Update on your CyberHook account application`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Account Application Update</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${args.firstName}, thank you for your interest in CyberHook. After reviewing your application, 
        we're unable to approve your account at this time.
      </p>
      <div style="padding:16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">Why was my application declined?</p>
        <p style="margin:4px 0 0;font-size:13px;color:#a16207;">
          CyberHook provides access to sensitive dark web intelligence. We carefully verify all accounts to 
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

function passwordResetEmailTemplate(args: {
  firstName: string;
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Reset your CyberHook password`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">Password Reset</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${args.firstName}, we received a request to reset your CyberHook password. 
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
    inviterName: v.string(),
    companyName: v.string(),
    inviteeEmail: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const signUpUrl = `https://app.cyberhook.ai?invite=${encodeURIComponent(args.inviteeEmail)}`;
    const { subject, html } = inviteEmailTemplate({
      inviterName: args.inviterName,
      companyName: args.companyName,
      inviteeEmail: args.inviteeEmail,
      role: args.role,
      signUpUrl,
    });

    await resend.sendEmail(ctx, {
      from: FROM_TEAM,
      to: args.inviteeEmail,
      subject,
      html,
    });
  },
});

// ─── Public Actions ──────────────────────────────────────────────────────────

export const sendInviteEmail = action({
  args: {
    inviterName: v.string(),
    companyName: v.string(),
    inviteeEmail: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const signUpUrl = `https://app.cyberhook.ai?invite=${encodeURIComponent(args.inviteeEmail)}`;
    const { subject, html } = inviteEmailTemplate({
      inviterName: args.inviterName,
      companyName: args.companyName,
      inviteeEmail: args.inviteeEmail,
      role: args.role,
      signUpUrl,
    });

    await resend.sendEmail(ctx, {
      from: FROM_TEAM,
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
