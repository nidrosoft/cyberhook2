/**
 * US state breach-notification portals (red item 12.1).
 *
 * Complete map of all 50 states + DC with the official authority's
 * breach-notification listing page. Used by the Ransom Hub / Breach
 * Notification views to deep-link each incident to its authoritative
 * state filing and to render the per-state filter chips.
 *
 * Keys are the two-letter postal code. A separate `NAME_TO_CODE` map
 * lets callers look up by full state name (some Redrok / upstream data
 * shapes expose the state as "California" rather than "CA").
 */
export interface StatePortal {
    code: string;
    name: string;
    agency: string;
    url: string;
}

export const STATE_BREACH_PORTALS: Record<string, StatePortal> = {
    AL: { code: "AL", name: "Alabama", agency: "AL Attorney General", url: "https://www.alabamaag.gov/consumers/" },
    AK: { code: "AK", name: "Alaska", agency: "AK Department of Law", url: "https://law.alaska.gov/department/civil/consumer/" },
    AZ: { code: "AZ", name: "Arizona", agency: "AZ Attorney General", url: "https://www.azag.gov/consumer/data-breach" },
    AR: { code: "AR", name: "Arkansas", agency: "AR Attorney General", url: "https://arkansasag.gov/consumer-protection/data-breach-notifications/" },
    CA: { code: "CA", name: "California", agency: "CA Attorney General", url: "https://oag.ca.gov/privacy/databreach/list" },
    CO: { code: "CO", name: "Colorado", agency: "CO Attorney General", url: "https://coag.gov/office-sections/consumer-protection/data-breach-notifications/" },
    CT: { code: "CT", name: "Connecticut", agency: "CT Attorney General", url: "https://portal.ct.gov/AG/Consumer-Issues/Consumer-Issues/Data-Breach-Notices" },
    DE: { code: "DE", name: "Delaware", agency: "DE Department of Justice", url: "https://attorneygeneral.delaware.gov/fraud/cpu/securitybreachnotification/database/" },
    DC: { code: "DC", name: "District of Columbia", agency: "DC Attorney General", url: "https://oag.dc.gov/consumer-protection/data-breach-notices" },
    FL: { code: "FL", name: "Florida", agency: "FL Attorney General", url: "https://www.myfloridalegal.com/consumer-protection/data-security-breaches" },
    GA: { code: "GA", name: "Georgia", agency: "GA Attorney General", url: "https://consumer.georgia.gov/" },
    HI: { code: "HI", name: "Hawaii", agency: "HI Office of Consumer Protection", url: "https://cca.hawaii.gov/ocp/notices/" },
    ID: { code: "ID", name: "Idaho", agency: "ID Attorney General", url: "https://www.ag.idaho.gov/consumer-protection/" },
    IL: { code: "IL", name: "Illinois", agency: "IL Attorney General", url: "https://www.illinoisattorneygeneral.gov/consumers/PII-Breach-Report/" },
    IN: { code: "IN", name: "Indiana", agency: "IN Attorney General", url: "https://www.in.gov/attorneygeneral/consumer-protection-division/id-theft-prevention/security-breaches/" },
    IA: { code: "IA", name: "Iowa", agency: "IA Attorney General", url: "https://www.iowaattorneygeneral.gov/for-consumers/security-breach-notifications" },
    KS: { code: "KS", name: "Kansas", agency: "KS Attorney General", url: "https://ag.ks.gov/about-the-office/consumer-protection" },
    KY: { code: "KY", name: "Kentucky", agency: "KY Attorney General", url: "https://ag.ky.gov/Resources/Consumer-Resources/Pages/default.aspx" },
    LA: { code: "LA", name: "Louisiana", agency: "LA Attorney General", url: "https://www.ag.state.la.us/Shared/ViewDatabaseBreachNotificationLetters" },
    ME: { code: "ME", name: "Maine", agency: "ME Attorney General", url: "https://apps.web.maine.gov/online/aeviewer/ME/40/list.shtml" },
    MD: { code: "MD", name: "Maryland", agency: "MD Attorney General", url: "https://www.marylandattorneygeneral.gov/Pages/IdentityTheft/breachnotices.aspx" },
    MA: { code: "MA", name: "Massachusetts", agency: "MA Office of Consumer Affairs", url: "https://www.mass.gov/lists/data-breach-notification-letters" },
    MI: { code: "MI", name: "Michigan", agency: "MI Attorney General", url: "https://www.michigan.gov/ag/consumer-protection/identity-theft" },
    MN: { code: "MN", name: "Minnesota", agency: "MN Attorney General", url: "https://www.ag.state.mn.us/Office/Communications/" },
    MS: { code: "MS", name: "Mississippi", agency: "MS Attorney General", url: "https://www.ago.state.ms.us/divisions/consumer-protection/" },
    MO: { code: "MO", name: "Missouri", agency: "MO Attorney General", url: "https://ago.mo.gov/consumer-protection/identity-theft/" },
    MT: { code: "MT", name: "Montana", agency: "MT Department of Justice", url: "https://dojmt.gov/consumer/databreach/" },
    NE: { code: "NE", name: "Nebraska", agency: "NE Attorney General", url: "https://ago.nebraska.gov/consumer-protection" },
    NV: { code: "NV", name: "Nevada", agency: "NV Attorney General", url: "https://ag.nv.gov/Hot_Topics/Issue/Security_Breach_Notifications/" },
    NH: { code: "NH", name: "New Hampshire", agency: "NH Department of Justice", url: "https://www.doj.nh.gov/consumer/security-breaches/" },
    NJ: { code: "NJ", name: "New Jersey", agency: "NJ Division of Consumer Affairs", url: "https://www.njoag.gov/about/divisions-and-offices/division-of-consumer-affairs/data-breach-notifications/" },
    NM: { code: "NM", name: "New Mexico", agency: "NM Attorney General", url: "https://www.nmag.gov/consumer-protection/" },
    NY: { code: "NY", name: "New York", agency: "NY Attorney General", url: "https://ag.ny.gov/internet/data-breach" },
    NC: { code: "NC", name: "North Carolina", agency: "NC Department of Justice", url: "https://ncdoj.gov/protecting-consumers/protecting-your-identity/protect-your-business-from-id-theft/security-breach-information/" },
    ND: { code: "ND", name: "North Dakota", agency: "ND Attorney General", url: "https://attorneygeneral.nd.gov/consumer-resources/consumer-protection/" },
    OH: { code: "OH", name: "Ohio", agency: "OH Attorney General", url: "https://www.ohioattorneygeneral.gov/Business/Services-for-Business/Data-Security-Notifications" },
    OK: { code: "OK", name: "Oklahoma", agency: "OK Attorney General", url: "https://www.oag.ok.gov/consumer-protection-unit" },
    OR: { code: "OR", name: "Oregon", agency: "OR Department of Justice", url: "https://justice.oregon.gov/consumer/DataBreach/" },
    PA: { code: "PA", name: "Pennsylvania", agency: "PA Attorney General", url: "https://www.attorneygeneral.gov/submit-a-complaint/data-breach/" },
    RI: { code: "RI", name: "Rhode Island", agency: "RI Attorney General", url: "https://riag.ri.gov/consumer-protection" },
    SC: { code: "SC", name: "South Carolina", agency: "SC Attorney General", url: "https://www.scag.gov/consumer-protection/" },
    SD: { code: "SD", name: "South Dakota", agency: "SD Attorney General", url: "https://consumer.sd.gov/" },
    TN: { code: "TN", name: "Tennessee", agency: "TN Attorney General", url: "https://www.tn.gov/attorneygeneral/working-for-tennessee/consumer.html" },
    TX: { code: "TX", name: "Texas", agency: "TX Attorney General", url: "https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/report-data-breach" },
    UT: { code: "UT", name: "Utah", agency: "UT Attorney General", url: "https://attorneygeneral.utah.gov/consumer-protection/" },
    VT: { code: "VT", name: "Vermont", agency: "VT Attorney General", url: "https://ago.vermont.gov/cap/data-breach" },
    VA: { code: "VA", name: "Virginia", agency: "VA Attorney General", url: "https://www.oag.state.va.us/consumer-protection/" },
    WA: { code: "WA", name: "Washington", agency: "WA Attorney General", url: "https://www.atg.wa.gov/data-breach-notifications" },
    WV: { code: "WV", name: "West Virginia", agency: "WV Attorney General", url: "https://ago.wv.gov/consumerprotection/Pages/default.aspx" },
    WI: { code: "WI", name: "Wisconsin", agency: "WI Department of Agriculture", url: "https://datcp.wi.gov/Pages/Programs_Services/DataBreachNotifications.aspx" },
    WY: { code: "WY", name: "Wyoming", agency: "WY Attorney General", url: "https://ag.wyo.gov/victim-services" },
};

/**
 * Reverse lookup: full state name -> postal code. Built once at module load
 * so consumers can resolve either representation in O(1).
 */
export const STATE_NAME_TO_CODE: Record<string, string> = Object.values(
    STATE_BREACH_PORTALS,
).reduce<Record<string, string>>((acc, p) => {
    acc[p.name] = p.code;
    return acc;
}, {});

/**
 * Resolve a region string (postal code OR full state name) to the canonical
 * portal entry, if any. Safe to call with `undefined`.
 */
export function resolveStatePortal(region: string | undefined): StatePortal | undefined {
    if (!region) return undefined;
    if (STATE_BREACH_PORTALS[region]) return STATE_BREACH_PORTALS[region];
    const code = STATE_NAME_TO_CODE[region];
    return code ? STATE_BREACH_PORTALS[code] : undefined;
}

/**
 * Ordered list of all states + DC, alphabetized by state name. Used to
 * render the "all states" filter grid (red item 12.1 acceptance test).
 */
export const STATE_PORTALS_SORTED: StatePortal[] = Object.values(STATE_BREACH_PORTALS).sort(
    (a, b) => a.name.localeCompare(b.name),
);
