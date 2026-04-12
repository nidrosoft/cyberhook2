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

export default crons;
