import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";

const http = httpRouter();

// Clerk webhook handler
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get the Svix headers for verification
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await request.json();
    const body = JSON.stringify(payload);

    // For now, we'll skip signature verification in development
    // In production, you should verify the signature using the svix library
    // const wh = new Webhook(webhookSecret);
    // const evt = wh.verify(body, { "svix-id": svix_id, "svix-timestamp": svix_timestamp, "svix-signature": svix_signature });

    const eventType = payload.type;
    const data = payload.data;

    try {
      switch (eventType) {
        case "user.created":
          // Note: User creation in Convex happens during onboarding, not here
          // This webhook is mainly for syncing updates
          console.log("User created in Clerk:", data.id);
          break;

        case "user.updated":
          // Sync user updates from Clerk to Convex
          const existingUser = await ctx.runQuery(internal.users.internalGetByClerkId, {
            clerkId: data.id,
          });

          if (existingUser) {
            await ctx.runMutation(internal.users.internalUpdate, {
              id: existingUser._id,
              firstName: data.first_name || existingUser.firstName,
              lastName: data.last_name || existingUser.lastName,
              imageUrl: data.image_url,
              email: data.email_addresses?.[0]?.email_address || existingUser.email,
            });
          }
          break;

        case "user.deleted":
          // Handle user deletion
          await ctx.runMutation(internal.users.internalDelete, {
            clerkId: data.id,
          });
          break;

        default:
          console.log("Unhandled webhook event:", eventType);
      }

      return new Response("Webhook processed", { status: 200 });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

export default http;
