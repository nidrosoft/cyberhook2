import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Live, on-demand fetch of public breach-portal HTML for the Ransom Hub
 * "View Portal" feature. Browsers block iframing these sites via
 * X-Frame-Options/CSP, so we fetch + parse server-side and render the
 * rows in our own table.
 *
 * Each portal's HTML structure can change without notice, so every
 * parser is defensive: missing fields produce undefined rather than
 * throwing, and an empty result returns `success: true, rows: []` so
 * the UI can show an "embedding not available" fallback.
 *
 * No auth required — these are public portals, but we still rate-limit
 * by only running on user click (no cron, no client-side fetch).
 */

export type PortalRow = {
  companyName: string;
  industry?: string;
  individualsAffected?: number;
  filedDateMs?: number;
  attackDateMs?: number;
  region?: string;
  breachVector?: string;
  sourceUrl?: string;
};

export type PortalFetchResult = {
  success: boolean;
  source: "hhs_ocr" | "california_ag" | "privacy_rights";
  rows: PortalRow[];
  error?: string;
};

// ─── Shared helpers ──────────────────────────────────────────────────────────

const COMMON_FETCH_HEADERS = {
  // Identify ourselves; some government portals reject blank User-Agent.
  "User-Agent":
    "Mozilla/5.0 (compatible; CyberHookBot/1.0; +https://cyberhook.ai)",
  Accept: "text/html,application/json,*/*;q=0.8",
};

function parseDate(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? undefined : ms;
}

function parseAffected(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const cleaned = input.replace(/[^0-9]/g, "");
  if (!cleaned) return undefined;
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? undefined : n;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(s: string): string {
  return decodeHtml(s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

/** Parse all <tr>...</tr> blocks out of an HTML string. */
function extractRows(html: string): string[] {
  const matches = html.match(/<tr[\s\S]*?<\/tr>/gi);
  return matches ?? [];
}

/** Parse <td> cells (or <th>) from a single row. */
function extractCells(rowHtml: string): string[] {
  const matches = rowHtml.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
  if (!matches) return [];
  return matches.map((cell) => {
    const inner = cell.replace(/^<t[dh][^>]*>/i, "").replace(/<\/t[dh]>$/i, "");
    return stripTags(inner);
  });
}

// ─── HHS OCR ─────────────────────────────────────────────────────────────────
// The HHS OCR Breach Portal ("Wall of Shame") is JSF-driven and not
// directly parseable. There is no official public JSON feed. We return
// an empty result with `success: true` so the UI shows the
// "open-in-new-tab" fallback card.

async function fetchHHSOCR(): Promise<PortalFetchResult> {
  return {
    success: true,
    source: "hhs_ocr",
    rows: [],
    error: "HHS OCR portal does not expose a public JSON feed. Use 'Open in new tab' to view.",
  };
}

// ─── California Attorney General ─────────────────────────────────────────────
// CA AG publishes an HTML listing at /privacy/databreach/list with one
// row per breach. Each row has columns like Organization Name,
// Date(s) of Breach, Reported Date.

async function fetchCaliforniaAG(): Promise<PortalFetchResult> {
  const url = "https://oag.ca.gov/privacy/databreach/list";
  try {
    const res = await fetch(url, { headers: COMMON_FETCH_HEADERS });
    if (!res.ok) {
      return {
        success: false,
        source: "california_ag",
        rows: [],
        error: `Portal returned HTTP ${res.status}.`,
      };
    }
    const html = await res.text();
    const rows = extractRows(html);

    const parsed: PortalRow[] = [];
    for (const row of rows) {
      const cells = extractCells(row);
      // CA AG layout: [Organization Name, Date(s) of Breach, Reported Date]
      if (cells.length < 3) continue;
      const companyName = cells[0];
      // Skip header rows — they include the literal label text.
      if (
        !companyName ||
        /organization\s*name/i.test(companyName) ||
        companyName.length < 2
      ) {
        continue;
      }
      const breachDateStr = cells[1];
      const reportedDateStr = cells[2];
      // Some "breach date" cells contain multiple comma-separated dates;
      // take the first parseable one as the attack date.
      const firstBreachDate = breachDateStr.split(",")[0]?.trim();
      parsed.push({
        companyName,
        attackDateMs: parseDate(firstBreachDate),
        filedDateMs: parseDate(reportedDateStr),
        region: "CA",
        sourceUrl: url,
      });
    }
    return {
      success: parsed.length > 0,
      source: "california_ag",
      rows: parsed,
      error:
        parsed.length === 0
          ? "Couldn't parse rows from CA AG portal — its HTML structure may have changed."
          : undefined,
    };
  } catch (err) {
    return {
      success: false,
      source: "california_ag",
      rows: [],
      error: err instanceof Error ? err.message : "Failed to fetch CA AG portal.",
    };
  }
}

// ─── Privacy Rights Clearinghouse ────────────────────────────────────────────
// privacyrights.org/data-breaches uses a Drupal-rendered table. Field
// order varies by view; we make a best-effort parse and bail out cleanly
// if rows can't be extracted.

async function fetchPrivacyRights(): Promise<PortalFetchResult> {
  const url = "https://www.privacyrights.org/data-breaches";
  try {
    const res = await fetch(url, { headers: COMMON_FETCH_HEADERS });
    if (!res.ok) {
      return {
        success: false,
        source: "privacy_rights",
        rows: [],
        error: `Portal returned HTTP ${res.status}.`,
      };
    }
    const html = await res.text();
    const rows = extractRows(html);
    const parsed: PortalRow[] = [];
    for (const row of rows) {
      const cells = extractCells(row);
      if (cells.length < 2) continue;
      const companyName = cells[0];
      if (
        !companyName ||
        /organization|company|name/i.test(companyName) === true && companyName.length < 30
      ) {
        // Heuristic: skip header rows where first cell is the label itself.
        if (companyName.length < 30) continue;
      }
      // Best-effort field detection across cells.
      let industry: string | undefined;
      let affected: number | undefined;
      let dateMs: number | undefined;
      for (const cell of cells.slice(1)) {
        if (!affected) affected = parseAffected(cell);
        if (!dateMs) dateMs = parseDate(cell);
        if (!industry && /^[A-Z][a-zA-Z\s&\/-]{2,40}$/.test(cell)) industry = cell;
      }
      parsed.push({
        companyName,
        industry,
        individualsAffected: affected,
        filedDateMs: dateMs,
        sourceUrl: url,
      });
    }
    return {
      success: parsed.length > 0,
      source: "privacy_rights",
      rows: parsed.slice(0, 100),
      error:
        parsed.length === 0
          ? "Couldn't parse rows from Privacy Rights Clearinghouse."
          : undefined,
    };
  } catch (err) {
    return {
      success: false,
      source: "privacy_rights",
      rows: [],
      error:
        err instanceof Error ? err.message : "Failed to fetch Privacy Rights portal.",
    };
  }
}

// ─── Public action ───────────────────────────────────────────────────────────

export const fetchPortalLive = action({
  args: {
    source: v.union(
      v.literal("hhs_ocr"),
      v.literal("california_ag"),
      v.literal("privacy_rights"),
    ),
  },
  handler: async (_ctx, args): Promise<PortalFetchResult> => {
    switch (args.source) {
      case "hhs_ocr":
        return fetchHHSOCR();
      case "california_ag":
        return fetchCaliforniaAG();
      case "privacy_rights":
        return fetchPrivacyRights();
    }
  },
});
