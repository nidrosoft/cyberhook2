import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth, assertCompanyAccess } from "./lib/auth";

export const getByLeadId = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Not found");
    assertCompanyAccess(user.companyId, lead.companyId);

    return await ctx.db
      .query("contacts")
      .withIndex("by_leadId", (q) => q.eq("leadId", args.leadId))
      .collect();
  },
});

export const getByCompanyId = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    assertCompanyAccess(user.companyId, args.companyId);

    return await ctx.db
      .query("contacts")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});
