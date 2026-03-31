import { v } from "convex/values";
import { query } from "./_generated/server";

export const getByLeadId = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_leadId", (q) => q.eq("leadId", args.leadId))
      .collect();
  },
});
