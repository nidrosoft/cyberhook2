import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Fetch recent ransomware victims daily at 6:00 AM UTC
crons.daily(
  "fetch-recent-ransomware-victims",
  { hourUTC: 6, minuteUTC: 0 },
  internal.ransomwareLiveApi.fetchRecentAndStore
);

// Fetch HHS OCR breach reports daily at 7:00 AM UTC
crons.daily(
  "fetch-hhs-ocr-breaches",
  { hourUTC: 7, minuteUTC: 0 },
  internal.breachPortalsApi.fetchHHSOCRBreaches
);

// Fetch California AG breach data daily at 7:30 AM UTC
crons.daily(
  "fetch-california-ag-breaches",
  { hourUTC: 7, minuteUTC: 30 },
  internal.breachPortalsApi.fetchCaliforniaAGBreaches
);

// Fetch Privacy Rights Clearinghouse data daily at 8:00 AM UTC
crons.daily(
  "fetch-privacy-rights-breaches",
  { hourUTC: 8, minuteUTC: 0 },
  internal.breachPortalsApi.fetchPrivacyRightsBreaches
);

// Phase 7: refresh OAuth access tokens before they expire. Runs every
// 5 minutes; only touches integrations whose `tokenExpiresAt` is within
// the next 10 minutes, so it's cheap to keep on a tight schedule.
crons.interval(
  "refresh-oauth-tokens",
  { minutes: 5 },
  internal.integrationsActions.refreshExpiring
);

export default crons;
