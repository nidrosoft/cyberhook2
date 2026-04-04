import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal, components } from "./_generated/api";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { Resend } from "@convex-dev/resend";

const resend = new Resend(components.resend, {});

// ─── Knowledge Base Context ──────────────────────────────────────────────────

export const getKnowledgeBaseContext = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("knowledgeBaseEntries")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    const snippets: string[] = [];
    for (const entry of entries) {
      if (entry.type === "rich_text" && entry.richTextContent) {
        const plain = entry.richTextContent.replace(/<[^>]*>/g, "").trim();
        if (plain) snippets.push(`[Template: ${entry.name}]\n${plain.slice(0, 500)}`);
      } else if (entry.type === "faq" && entry.question && entry.answer) {
        snippets.push(`[FAQ: ${entry.name}]\nQ: ${entry.question}\nA: ${entry.answer.slice(0, 300)}`);
      } else if (entry.type === "web_crawler" && entry.crawledContent) {
        snippets.push(`[Research: ${entry.name}]\n${entry.crawledContent.slice(0, 400)}`);
      }
    }

    return snippets.join("\n\n---\n\n");
  },
});

// ─── AI Prompt Engineering ───────────────────────────────────────────────────

function COLD_EMAIL_SYSTEM_PROMPT(senderCompany: string, kbContext?: string): string {
  return `You are the head of growth at "${senderCompany}", a cybersecurity firm. You have 20 years of experience writing cold emails that get replies.

YOUR PHILOSOPHY:
- You NEVER open with "I hope this finds you well", "I wanted to reach out", "My name is", or any generic filler
- You NEVER sound like a template or a bot — every email reads like a human wrote it specifically for this one person
- You lead with a PATTERN INTERRUPT: an unexpected fact, a provocative question, or a specific data point that makes the reader stop scrolling
- You treat the recipient as an intelligent peer, not a sales target
- You create urgency through specificity, not artificial pressure

YOUR STYLE:
- Short paragraphs (1-2 sentences max per paragraph)
- Conversational but authoritative — like a text from a trusted advisor
- You weave in specific threat data naturally, never as a list of features
- Your CTA is always low-friction and specific ("Would Tuesday or Wednesday work for a 12-min call?")
- You sign off with just your first name — no title, no company tagline

RULES:
- NEVER use these phrases: "I hope this email finds you well", "I wanted to reach out", "I came across your company", "As a leading provider", "In today's threat landscape", "Don't hesitate to reach out"
- NEVER start with the recipient's name on its own line (no "Hi John,\\n\\n" — weave the name into the opening or skip it)
- Subject lines must create curiosity or urgency — they should feel like a notification, not a pitch
- Keep total body under 120 words — shorter emails get more replies${kbContext ? `

COMPANY KNOWLEDGE BASE (use these insights to enrich your emails — reference talking points, value props, case studies, or industry-specific data where relevant):
${kbContext}` : ""}`;
}

function COLD_EMAIL_USER_PROMPT(args: {
  campaignName: string;
  campaignDescription?: string;
  recipientName: string;
  recipientDomain: string;
  recipientIndustry?: string;
  exposureCount: number;
  senderName: string;
  senderCompany: string;
}): string {
  const threatContext = args.exposureCount > 0
    ? `CRITICAL CONTEXT: Our scanners found ${args.exposureCount} exposed credential${args.exposureCount > 1 ? "s" : ""} linked to ${args.recipientDomain}. This is real data — use the specific number to create urgency. These could be employee logins, API keys, or session tokens found on dark web forums or paste sites.`
    : `CONTEXT: Our scan of ${args.recipientDomain} shows a clean exposure profile. Use this as a POSITIVE hook — compliment their security posture, but warn that clean companies are increasingly targeted because attackers assume they're not monitoring.`;

  const industryAngle = args.recipientIndustry
    ? `INDUSTRY ANGLE: They're in ${args.recipientIndustry}. Reference a specific, realistic threat pattern for this industry (e.g., ransomware for healthcare, supply chain attacks for manufacturing, credential stuffing for SaaS).`
    : "";

  return `Write a cold outreach email that will actually get a reply.

CAMPAIGN: "${args.campaignName}"
${args.campaignDescription ? `GOAL: ${args.campaignDescription}` : ""}

RECIPIENT:
- Company: ${args.recipientName} (${args.recipientDomain})
- Industry: ${args.recipientIndustry || "Unknown"}

${threatContext}

${industryAngle}

SENDER: ${args.senderName} from ${args.senderCompany}

APPROACH OPTIONS (pick the best one for this recipient):
1. THE DATA DROP: Lead with the specific exposure number as a cold open. "We found 15 credentials linked to microsoft.com on breach forums last week."
2. THE QUESTION: Open with a provocative question tied to their industry. "Quick question — does your security team know about the 3 employee logins from acme.com circulating on Telegram?"
3. THE PEER INSIGHT: Share a brief, specific insight about their industry's threat landscape as if you're a peer, not a vendor.
4. THE COMPLIMENT-THEN-WARNING: For clean profiles — acknowledge their good posture, then introduce a blind spot.

Pick whichever approach fits best. Do NOT use a template-style structure.

FORMAT EXACTLY AS:
SUBJECT: [subject line - max 50 chars, lowercase feels more personal, create curiosity]
BODY: [email body - under 120 words, sign off with just "${args.senderName}"]`;
}

// ─── AI Email Generation ─────────────────────────────────────────────────────

export const generateCampaignEmails = action({
  args: {
    campaignId: v.id("campaigns"),
    companyId: v.id("companies"),
    recipients: v.array(
      v.object({
        leadId: v.id("leads"),
        name: v.string(),
        domain: v.string(),
        industry: v.optional(v.string()),
        exposureCount: v.optional(v.number()),
        email: v.optional(v.string()),
      })
    ),
    campaignName: v.string(),
    campaignDescription: v.optional(v.string()),
    senderName: v.string(),
    senderCompany: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const anthropic = createAnthropic({ apiKey });

    const kbContext = await ctx.runQuery(internal.aiEmail.getKnowledgeBaseContext, {
      companyId: args.companyId,
    });

    const results: Array<{
      leadId: string;
      name: string;
      email: string;
      subject: string;
      body: string;
    }> = [];

    for (const recipient of args.recipients) {
      const { text } = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        system: COLD_EMAIL_SYSTEM_PROMPT(args.senderCompany, kbContext || undefined),
        prompt: COLD_EMAIL_USER_PROMPT({
          campaignName: args.campaignName,
          campaignDescription: args.campaignDescription,
          recipientName: recipient.name,
          recipientDomain: recipient.domain,
          recipientIndustry: recipient.industry,
          exposureCount: recipient.exposureCount ?? 0,
          senderName: args.senderName,
          senderCompany: args.senderCompany,
        }),
      });

      const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
      const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

      const subject = subjectMatch?.[1]?.trim() || `Security Alert: ${recipient.domain}`;
      const body = bodyMatch?.[1]?.trim() || text;

      results.push({
        leadId: recipient.leadId,
        name: recipient.name,
        email: recipient.email || `contact@${recipient.domain}`,
        subject,
        body,
      });
    }

    await ctx.runMutation(internal.aiEmail.saveGeneratedEmails, {
      campaignId: args.campaignId,
      companyId: args.companyId,
      emails: results,
    });

    return results;
  },
});

export const generatePreviewEmail = action({
  args: {
    recipientName: v.string(),
    recipientDomain: v.string(),
    recipientIndustry: v.optional(v.string()),
    exposureCount: v.optional(v.number()),
    campaignName: v.string(),
    campaignDescription: v.optional(v.string()),
    senderName: v.string(),
    senderCompany: v.string(),
    companyId: v.optional(v.id("companies")),
  },
  returns: v.object({
    subject: v.string(),
    body: v.string(),
  }),
  handler: async (ctx, args): Promise<{ subject: string; body: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const anthropic = createAnthropic({ apiKey });

    let kbContext: string | undefined;
    if (args.companyId) {
      const kbResult: string = await ctx.runQuery(internal.aiEmail.getKnowledgeBaseContext, {
        companyId: args.companyId,
      });
      kbContext = kbResult || undefined;
    }

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: COLD_EMAIL_SYSTEM_PROMPT(args.senderCompany, kbContext),
      prompt: COLD_EMAIL_USER_PROMPT({
        campaignName: args.campaignName,
        campaignDescription: args.campaignDescription,
        recipientName: args.recipientName,
        recipientDomain: args.recipientDomain,
        recipientIndustry: args.recipientIndustry,
        exposureCount: args.exposureCount ?? 0,
        senderName: args.senderName,
        senderCompany: args.senderCompany,
      }),
    });

    const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
    const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

    return {
      subject: subjectMatch?.[1]?.trim() || `Security Alert: ${args.recipientDomain}`,
      body: bodyMatch?.[1]?.trim() || text,
    };
  },
});

// ─── Email Sending via Resend ────────────────────────────────────────────────

export const sendCampaignEmails = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  returns: v.object({
    sentCount: v.number(),
    failedCount: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args): Promise<{ sentCount: number; failedCount: number; total: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const campaign = await ctx.runQuery(internal.aiEmail.getCampaignRaw, {
      campaignId: args.campaignId,
    });
    if (!campaign) throw new Error("Campaign not found");

    const company = await ctx.runQuery(internal.aiEmail.getCompany, {
      companyId: campaign.companyId,
    });
    if (!company) throw new Error("Company not found");

    const messages: Array<{
      messageId: any;
      recipientId: any;
      recipientEmail: string;
      recipientName: string;
      subject: string;
      body: string;
    }> = await ctx.runQuery(internal.aiEmail.getMessagesForCampaign, {
      campaignId: args.campaignId,
    });

    if (messages.length === 0) throw new Error("No draft messages to send");

    const fromEmail = company.salesEmail || `noreply@${company.website || "cyberhook.io"}`;
    const fromName = company.name;

    let sentCount = 0;
    let failedCount = 0;

    for (const message of messages) {
      try {
        const htmlBody = message.body
          .split("\n\n")
          .map((p: string) => `<p style="margin: 0 0 16px; line-height: 1.6; color: #333;">${p}</p>`)
          .join("");

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            ${htmlBody}
          </div>
        `;

        await resend.sendEmail(ctx, {
          from: `${fromName} <${fromEmail}>`,
          to: message.recipientEmail,
          subject: message.subject,
          html,
          text: message.body,
        });

        await ctx.runMutation(internal.aiEmail.updateMessageStatus, {
          messageId: message.messageId,
          recipientId: message.recipientId,
          status: "sent",
        });

        sentCount++;
      } catch (error) {
        await ctx.runMutation(internal.aiEmail.updateMessageStatus, {
          messageId: message.messageId,
          recipientId: message.recipientId,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        failedCount++;
      }
    }

    await ctx.runMutation(internal.aiEmail.updateCampaignAfterSend, {
      campaignId: args.campaignId,
      sentCount,
      status: failedCount === messages.length ? "paused" : "active",
    });

    return { sentCount, failedCount, total: messages.length };
  },
});

export const sendSingleEmail = action({
  args: {
    to: v.string(),
    from: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const emailId = await resend.sendEmail(ctx, {
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });

    return emailId;
  },
});

// ─── Internal helpers ────────────────────────────────────────────────────────

export const getCampaignRaw = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

export const getCompany = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.companyId);
  },
});

export const getMessagesForCampaign = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("campaignMessages")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .collect();

    const result = [];
    for (const msg of messages) {
      const recipient = await ctx.db.get(msg.recipientId);
      if (recipient) {
        result.push({
          messageId: msg._id,
          recipientId: msg.recipientId,
          recipientEmail: recipient.email,
          recipientName: recipient.name || "",
          subject: msg.subject,
          body: msg.body,
        });
      }
    }
    return result;
  },
});

export const updateMessageStatus = internalMutation({
  args: {
    messageId: v.id("campaignMessages"),
    recipientId: v.id("campaignRecipients"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      status: args.status,
      sentAt: args.status === "sent" ? now : undefined,
      errorMessage: args.errorMessage,
    });
    await ctx.db.patch(args.recipientId, {
      status: args.status === "sent" ? "sent" : "pending",
    });
  },
});

export const updateCampaignAfterSend = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    sentCount: v.number(),
    status: v.union(v.literal("active"), v.literal("paused")),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return;

    await ctx.db.patch(args.campaignId, {
      status: args.status,
      emailsSent: (campaign.emailsSent || 0) + args.sentCount,
      updatedAt: Date.now(),
    });
  },
});

// ─── Persistence ─────────────────────────────────────────────────────────────

export const saveGeneratedEmails = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    companyId: v.id("companies"),
    emails: v.array(
      v.object({
        leadId: v.string(),
        name: v.string(),
        email: v.string(),
        subject: v.string(),
        body: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const email of args.emails) {
      const recipientId = await ctx.db.insert("campaignRecipients", {
        campaignId: args.campaignId,
        companyId: args.companyId,
        leadId: email.leadId as any,
        email: email.email,
        name: email.name,
        status: "pending",
        createdAt: now,
      });

      await ctx.db.insert("campaignMessages", {
        campaignId: args.campaignId,
        recipientId,
        companyId: args.companyId,
        subject: email.subject,
        body: email.body,
        status: "draft",
        createdAt: now,
      });
    }

    await ctx.db.patch(args.campaignId, {
      totalRecipients: args.emails.length,
      updatedAt: now,
    });
  },
});
