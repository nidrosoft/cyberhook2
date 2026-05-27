import { action, query } from "./_generated/server";
import { api, components, internal } from "./_generated/api";
import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";

type ActionCtx = GenericActionCtx<DataModel>;

// Phase 4B: customer/checkout/portal creation is now done via raw Stripe
// REST API in this file (see `resolveCustomerId`, `createCheckoutSession`,
// `createPortalSession`). The `@convex-dev/stripe` component is still used
// for webhook event ingestion (`registerRoutes` in `http.ts`) and read-only
// queries over the subscription/invoice/payment tables it maintains.

/**
 * Direct Stripe REST helper. The @convex-dev/stripe component doesn't expose
 * `listPaymentMethods`, so we hit the API ourselves for read-only billing UI.
 * Uses the `STRIPE_SECRET_KEY` Convex env var.
 */
async function stripeGet<T>(path: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe API ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/**
 * POST helper for Stripe REST. Form-encodes the body the way Stripe expects
 * (including bracketed nested fields like `subscription_data[trial_period_days]`).
 */
async function stripePost<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe API ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Returns a Stripe customer ID for the signed-in user. Reads the cached id
 * from `companies.stripeCustomerId`, verifies it still exists in Stripe,
 * and recreates a new customer if the cached one was archived/deleted
 * (typically caused by switching between live and test keys mid-flight).
 *
 * Always keeps `companies.stripeCustomerId` in sync with what we return.
 */
async function resolveCustomerId(
  ctx: ActionCtx,
  identity: { subject: string; email?: string; name?: string },
): Promise<{ customerId: string; companyId: import("./_generated/dataModel").Id<"companies"> | null }> {
  const me = await ctx.runQuery(api.users.getCurrentUserWithCompany, {});
  const companyId = me?.company?._id ?? null;
  const cached = me?.company?.stripeCustomerId;

  if (cached) {
    try {
      const c = await stripeGet<{ id: string; deleted?: boolean }>(`/v1/customers/${encodeURIComponent(cached)}`);
      if (!c.deleted) return { customerId: c.id, companyId };
    } catch {
      // Cached customer ID isn't valid for the current Stripe key set
      // (e.g. created in test mode, looking it up in live). Fall through
      // and create a fresh one.
    }
  }

  const created = await stripePost<{ id: string }>("/v1/customers", {
    email: identity.email,
    name: identity.name,
    "metadata[clerkUserId]": identity.subject,
  });

  if (companyId) {
    await ctx.runMutation(internal.companies.updateStripeInfo, {
      id: companyId,
      stripeCustomerId: created.id,
    });
  }

  return { customerId: created.id, companyId };
}

export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
    planId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    /** Optional free-trial length in days. Used by signup flow. */
    trialPeriodDays: v.optional(v.number()),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Resolve a *valid* Stripe customer for this user — auto-recreates if the
    // cached ID was archived (common when moving between test/live keys).
    const { customerId, companyId } = await resolveCustomerId(ctx, {
      subject: identity.subject,
      email: identity.email,
      name: identity.name,
    });

    // Mirror the plan choice + trial-end onto the company so the rest of the
    // app reflects the intent even before the checkout.session.completed
    // webhook lands.
    if (companyId) {
      await ctx.runMutation(internal.companies.updateStripeInfo, {
        id: companyId,
        stripeCustomerId: customerId,
        planId: args.planId,
        planStatus: args.trialPeriodDays && args.trialPeriodDays > 0 ? "trialing" : "active",
        trialEndsAt: args.trialPeriodDays && args.trialPeriodDays > 0
          ? Date.now() + args.trialPeriodDays * 24 * 60 * 60 * 1000
          : undefined,
      });
    }

    const session = await stripePost<{ url: string; id: string }>("/v1/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": args.priceId,
      "line_items[0][quantity]": 1,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      "subscription_data[metadata][userId]": identity.subject,
      "subscription_data[metadata][planId]": args.planId,
      "metadata[userId]": identity.subject,
      "metadata[planId]": args.planId,
      allow_promotion_codes: "true",
      ...(args.trialPeriodDays && args.trialPeriodDays > 0
        ? { "subscription_data[trial_period_days]": args.trialPeriodDays }
        : {}),
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  },
});

export const createPortalSession = action({
  args: {
    returnUrl: v.string(),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { customerId } = await resolveCustomerId(ctx, {
      subject: identity.subject,
      email: identity.email,
      name: identity.name,
    });

    const session = await stripePost<{ url: string; id: string }>("/v1/billing_portal/sessions", {
      customer: customerId,
      return_url: args.returnUrl,
    });
    if (!session.url) throw new Error("Stripe did not return a portal URL.");
    return { url: session.url };
  },
});

export const getUserSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );
  },
});

export const getUserPayments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.runQuery(
      components.stripe.public.listPaymentsByUserId,
      { userId: identity.subject },
    );
  },
});

export const getUserInvoices = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const customer = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );

    if (!customer || customer.length === 0) return [];

    return await ctx.runQuery(
      components.stripe.public.listInvoices,
      { stripeCustomerId: customer[0].stripeCustomerId },
    );
  },
});

// Phase 4F — Real billing data ----------------------------------------------

type StripePaymentMethod = {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
};

type StripeInvoice = {
  id: string;
  number: string | null;
  amount_paid: number;
  amount_due: number;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created: number;
  currency: string;
  lines: { data: Array<{ price: { id: string } | null }> };
};

type StripeCustomer = {
  invoice_settings: { default_payment_method: string | null };
};

/**
 * Fetch up to 24 most recent Stripe invoices for the current company. Returns
 * `null` if the company has no Stripe customer yet (e.g. trial without
 * checkout). Each invoice includes a hosted-page URL and PDF for download.
 */
export const listInvoices = action({
  args: {},
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        id: v.string(),
        number: v.union(v.string(), v.null()),
        amount: v.number(), // dollars
        currency: v.string(),
        status: v.union(v.string(), v.null()),
        hostedInvoiceUrl: v.union(v.string(), v.null()),
        pdfUrl: v.union(v.string(), v.null()),
        createdAt: v.number(), // ms epoch
      }),
    ),
  ),
  handler: async (ctx): Promise<Array<{
    id: string;
    number: string | null;
    amount: number;
    currency: string;
    status: string | null;
    hostedInvoiceUrl: string | null;
    pdfUrl: string | null;
    createdAt: number;
  }> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.runQuery(api.users.getCurrentUserWithCompany, {});
    const customerId = me?.company?.stripeCustomerId;
    if (!customerId) return null;

    const data = await stripeGet<{ data: StripeInvoice[] }>(
      `/v1/invoices?customer=${encodeURIComponent(customerId)}&limit=24`,
    );
    return data.data.map((i) => ({
      id: i.id,
      number: i.number,
      amount: (i.amount_paid || i.amount_due) / 100,
      currency: i.currency.toUpperCase(),
      status: i.status,
      hostedInvoiceUrl: i.hosted_invoice_url,
      pdfUrl: i.invoice_pdf,
      createdAt: i.created * 1000,
    }));
  },
});

/**
 * Fetch the card payment methods attached to the current company's Stripe
 * customer, marking the default with `isDefault`. Returns `null` if there is
 * no Stripe customer.
 */
export const listPaymentMethods = action({
  args: {},
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        id: v.string(),
        brand: v.string(),
        last4: v.string(),
        expMonth: v.number(),
        expYear: v.number(),
        isDefault: v.boolean(),
      }),
    ),
  ),
  handler: async (ctx): Promise<Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  }> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.runQuery(api.users.getCurrentUserWithCompany, {});
    const customerId = me?.company?.stripeCustomerId;
    if (!customerId) return null;

    const [methods, customer] = await Promise.all([
      stripeGet<{ data: StripePaymentMethod[] }>(
        `/v1/customers/${encodeURIComponent(customerId)}/payment_methods?type=card&limit=12`,
      ),
      stripeGet<StripeCustomer>(`/v1/customers/${encodeURIComponent(customerId)}`),
    ]);
    const defaultPm = customer.invoice_settings?.default_payment_method ?? null;

    return methods.data
      .filter((m) => m.card)
      .map((m) => ({
        id: m.id,
        brand: m.card!.brand,
        last4: m.card!.last4,
        expMonth: m.card!.exp_month,
        expYear: m.card!.exp_year,
        isDefault: m.id === defaultPm,
      }));
  },
});
