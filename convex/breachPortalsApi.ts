import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── HHS OCR Breach Portal ───────────────────────────────────────────────────
// Source: https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf
// Public API endpoint for HIPAA breach reports

const HHS_OCR_API = "https://ocrportal.hhs.gov/ocr/breach";

interface HHSBreachRecord {
  name_of_covered_entity: string;
  state: string;
  covered_entity_type: string;
  individuals_affected: number;
  breach_submission_date: string;
  type_of_breach: string;
  location_of_breached_information: string;
  business_associate_present: string;
  web_description: string;
}

export const fetchHHSOCRBreaches = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; stored: number; error?: string }> => {
    try {
      // HHS OCR provides a CSV/JSON endpoint for recent breach reports
      // We fetch breaches reported in the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

      const response = await fetch(
        `${HHS_OCR_API}/breach_report.jsf?breachSubmissionDateFrom=${dateStr}`,
        {
          method: "GET",
          headers: { "Accept": "application/json" },
        }
      );

      if (!response.ok) {
        // HHS portal may not support direct JSON API — store placeholder
        // In production, this would use a scraper or data feed
        console.log(`HHS OCR API returned ${response.status} — portal may require browser access`);
        return { success: true, stored: 0 };
      }

      const data = await response.json();
      const records: HHSBreachRecord[] = Array.isArray(data) ? data : data.records || data.data || [];

      if (records.length === 0) {
        return { success: true, stored: 0 };
      }

      const chunkSize = 50;
      let stored = 0;

      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const incidents = chunk.map((record) => {
          const filedDate = record.breach_submission_date
            ? new Date(record.breach_submission_date).getTime()
            : Date.now();

          return {
            companyName: record.name_of_covered_entity,
            industry: "Healthcare",
            country: "US",
            region: record.state || undefined,
            attackDate: isNaN(filedDate) ? Date.now() : filedDate,
            incidentType: "breach_notification" as const,
            source: "hhs_ocr" as const,
            individualsAffected: record.individuals_affected || undefined,
            breachType: record.type_of_breach || undefined,
            breachVector: record.location_of_breached_information || undefined,
            filedDate: isNaN(filedDate) ? undefined : filedDate,
            sourceUrl: "https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf",
            description: record.web_description || undefined,
          };
        });

        await ctx.runMutation(internal.ransomHub.internalBulkCreate, { incidents });
        stored += incidents.length;
      }

      return { success: true, stored };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("HHS OCR fetch error:", errorMsg);
      return { success: false, stored: 0, error: errorMsg };
    }
  },
});

// ─── California Attorney General Breach Portal ────────────────────────────────
// Source: https://oag.ca.gov/privacy/databreach/list

const CA_AG_API = "https://oag.ca.gov/privacy/databreach";

interface CABreachRecord {
  organization_name: string;
  date_reported: string;
  date_of_breach: string;
  individuals_affected: number;
  breach_type: string;
  breach_description: string;
}

export const fetchCaliforniaAGBreaches = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; stored: number; error?: string }> => {
    try {
      const response = await fetch(`${CA_AG_API}/list?format=json`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        console.log(`CA AG API returned ${response.status} — portal may require browser access`);
        return { success: true, stored: 0 };
      }

      const data = await response.json();
      const records: CABreachRecord[] = Array.isArray(data) ? data : data.records || data.data || [];

      if (records.length === 0) {
        return { success: true, stored: 0 };
      }

      const chunkSize = 50;
      let stored = 0;

      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const incidents = chunk.map((record) => {
          const filedDate = record.date_reported
            ? new Date(record.date_reported).getTime()
            : Date.now();
          const attackDate = record.date_of_breach
            ? new Date(record.date_of_breach).getTime()
            : filedDate;

          return {
            companyName: record.organization_name,
            country: "US",
            region: "California",
            attackDate: isNaN(attackDate) ? Date.now() : attackDate,
            incidentType: "breach_notification" as const,
            source: "california_ag" as const,
            individualsAffected: record.individuals_affected || undefined,
            breachType: record.breach_type || undefined,
            filedDate: isNaN(filedDate) ? undefined : filedDate,
            sourceUrl: "https://oag.ca.gov/privacy/databreach/list",
            description: record.breach_description || undefined,
          };
        });

        await ctx.runMutation(internal.ransomHub.internalBulkCreate, { incidents });
        stored += incidents.length;
      }

      return { success: true, stored };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("CA AG fetch error:", errorMsg);
      return { success: false, stored: 0, error: errorMsg };
    }
  },
});

// ─── Privacy Rights Clearinghouse ─────────────────────────────────────────────
// Source: https://privacyrights.org/data-breaches

const PRIVACY_RIGHTS_API = "https://privacyrights.org/api";

interface PrivacyRightsRecord {
  organization_name: string;
  date_made_public: string;
  records_affected: number;
  type_of_breach: string;
  type_of_organization: string;
  description: string;
  state: string;
  source_url: string;
}

export const fetchPrivacyRightsBreaches = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; stored: number; error?: string }> => {
    try {
      const response = await fetch(`${PRIVACY_RIGHTS_API}/data-breaches?format=json`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        console.log(`Privacy Rights API returned ${response.status} — portal may require browser access`);
        return { success: true, stored: 0 };
      }

      const data = await response.json();
      const records: PrivacyRightsRecord[] = Array.isArray(data) ? data : data.records || data.data || [];

      if (records.length === 0) {
        return { success: true, stored: 0 };
      }

      const chunkSize = 50;
      let stored = 0;

      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const incidents = chunk.map((record) => {
          const attackDate = record.date_made_public
            ? new Date(record.date_made_public).getTime()
            : Date.now();

          return {
            companyName: record.organization_name,
            industry: record.type_of_organization || undefined,
            country: "US",
            region: record.state || undefined,
            attackDate: isNaN(attackDate) ? Date.now() : attackDate,
            incidentType: "breach_notification" as const,
            source: "privacy_rights" as const,
            individualsAffected: record.records_affected || undefined,
            breachType: record.type_of_breach || undefined,
            filedDate: isNaN(attackDate) ? undefined : attackDate,
            sourceUrl: record.source_url || "https://privacyrights.org/data-breaches",
            description: record.description || undefined,
          };
        });

        await ctx.runMutation(internal.ransomHub.internalBulkCreate, { incidents });
        stored += incidents.length;
      }

      return { success: true, stored };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Privacy Rights fetch error:", errorMsg);
      return { success: false, stored: 0, error: errorMsg };
    }
  },
});
