import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a short-lived upload URL for Convex file storage
export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: must be logged in to upload files");
  }
  return await ctx.storage.generateUploadUrl();
});

// Get a serving URL for a stored file
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
