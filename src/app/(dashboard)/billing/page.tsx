import { redirect } from "next/navigation";

/**
 * Phase 4E: the standalone /billing page was folded into the Settings UI,
 * which now hosts a dedicated "Billing" tab (invoices, payment methods,
 * "Manage Subscription"). Anything still linking to /billing — notifications,
 * legacy bookmarks, the upgrade modal — gets bounced to the Settings tab so
 * users always land on the canonical billing surface.
 */
export default function BillingPage() {
    redirect("/settings?tab=billing");
}
