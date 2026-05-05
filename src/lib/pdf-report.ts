import jsPDF from "jspdf";

interface ReportCredential {
    username: string;
    password: string;
    url: string;
    source: string;
    severity: number;
    timestamp: string;
    stealer?: string;
    breachName?: string;
    country?: string;
    computerName?: string;
    operatingSystem?: string;
}

interface ReportData {
    domain: string;
    companyName: string;
    credentials: ReportCredential[];
    isTrial: boolean;
    generatedAt: Date;
    mspCompanyName?: string;
    mspLogoUrl?: string;
    brandPrimaryColor?: string;
    brandSecondaryColor?: string;
    leadMetadata?: {
        industry?: string;
        website?: string;
        location?: string;
        employeeCount?: string;
        revenueRange?: string;
        exposureCount?: number;
        exposureSeverity?: string;
        source?: string;
        lastScanDate?: number;
    };
    recommendations?: string[];
}

function maskValue(value: string): string {
    if (!value || value.length < 4) return "****";
    return value.slice(0, 2) + "*".repeat(Math.min(value.length - 2, 8));
}

function hexToRgb(hex?: string): [number, number, number] {
    const normalized = hex?.replace("#", "").trim();
    if (!normalized || !/^[0-9a-f]{6}$/i.test(normalized)) return [40, 72, 122];
    return [
        parseInt(normalized.slice(0, 2), 16),
        parseInt(normalized.slice(2, 4), 16),
        parseInt(normalized.slice(4, 6), 16),
    ];
}

function severityLabel(severity: number): string {
    if (severity >= 8) return "Critical";
    if (severity >= 5) return "High";
    if (severity >= 3) return "Medium";
    if (severity >= 1) return "Low";
    return "Informational";
}

function severityScore(label?: string): number {
    switch (label?.toLowerCase()) {
        case "critical":
            return 9;
        case "high":
            return 7;
        case "medium":
            return 4;
        case "low":
            return 2;
        default:
            return 0;
    }
}

function safeText(value?: string | number): string {
    if (value === undefined || value === null || value === "") return "—";
    return String(value);
}

function sampleRecords(credentials: ReportCredential[]): Array<ReportCredential | null> {
    return [...credentials.slice(0, 5), ...Array(Math.max(0, 5 - credentials.length)).fill(null)];
}

function formatDate(value?: number | string): string {
    if (!value) return "—";
    const date = typeof value === "number" ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sanitizeFilePart(value: string): string {
    return value.replace(/[^a-z0-9.-]+/gi, "_").replace(/^_+|_+$/g, "") || "report";
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export async function generateExposureReport(data: ReportData) {
    const doc = new jsPDF({ compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const primary = hexToRgb(data.brandPrimaryColor);
    const secondary = hexToRgb(data.brandSecondaryColor);
    const mspName = data.mspCompanyName || "CyberHook Partner";
    const exposureCount = data.credentials.length || data.leadMetadata?.exposureCount || 0;
    const maxSeverity = Math.max(
        ...data.credentials.map((credential) => credential.severity || 0),
        severityScore(data.leadMetadata?.exposureSeverity),
    );
    const riskLabel = exposureCount === 0 ? "No Confirmed Exposure" : severityLabel(maxSeverity || 3);
    const sources = new Set(data.credentials.map((credential) => credential.source || credential.stealer).filter(Boolean));
    const logoDataUrl = data.mspLogoUrl ? await imageUrlToDataUrl(data.mspLogoUrl) : null;
    const logoImageType = logoDataUrl && (logoDataUrl.includes("image/jpeg") || logoDataUrl.includes("image/jpg")) ? "JPEG" : "PNG";
    let y = margin;

    const addPageIfNeeded = (height: number) => {
        if (y + height > pageHeight - 24) {
            doc.addPage();
            y = margin;
        }
    };

    const setText = (color: [number, number, number]) => {
        doc.setTextColor(color[0], color[1], color[2]);
    };

    const paragraph = (text: string, x: number, width: number, lineHeight = 5) => {
        const lines = doc.splitTextToSize(text, width);
        doc.text(lines, x, y);
        y += lines.length * lineHeight;
    };

    const sectionTitle = (title: string) => {
        addPageIfNeeded(16);
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        setText(primary);
        doc.text(title, margin, y);
        y += 5;
        doc.setDrawColor(primary[0], primary[1], primary[2]);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
    };

    const metricCard = (x: number, title: string, value: string, accent: [number, number, number]) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, 55, 25, 2, 2, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(title, x + 4, y + 7);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text(value, x + 4, y + 18);
    };

    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageWidth, 58, "F");
    doc.setFillColor(secondary[0], secondary[1], secondary[2]);
    doc.rect(0, 52, pageWidth, 6, "F");

    if (logoDataUrl) {
        try {
            const imageType = logoDataUrl.includes("image/jpeg") || logoDataUrl.includes("image/jpg") ? "JPEG" : "PNG";
            doc.addImage(logoDataUrl, imageType, margin, 12, 28, 14, undefined, "FAST");
        } catch {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin, 12, 28, 14, 2, 2, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            setText(primary);
            doc.text(mspName.slice(0, 12), margin + 3, 21);
        }
    } else {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, 12, 28, 14, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        setText(primary);
        doc.text(mspName.slice(0, 12), margin + 3, 21);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    doc.text(`Prepared by ${mspName}`, margin, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Prospecting Exposure Report", margin, 47);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    doc.text(
        `Generated ${data.generatedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        pageWidth - margin,
        18,
        { align: "right" },
    );

    y = 72;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setText(primary);
    doc.text(data.companyName, margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(data.domain, margin, y);
    y += 12;

    metricCard(margin, "Exposure Count", exposureCount >= 15 ? "15+" : String(exposureCount), primary);
    metricCard(margin + 62, "Risk Level", riskLabel, maxSeverity >= 8 ? [185, 28, 28] : maxSeverity >= 5 ? [194, 65, 12] : primary);
    metricCard(margin + 124, "Data Sources", String(sources.size || (exposureCount > 0 ? 1 : 0)), secondary);
    y += 36;

    sectionTitle("Executive Summary");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    paragraph(
        exposureCount > 0
            ? `${data.companyName} has indicators of exposed credentials or security-related records associated with ${data.domain}. These findings can create a direct path for account takeover, phishing, vendor impersonation, and ransomware access if they are not validated and remediated quickly.`
            : `${data.companyName} has no credential-level records included in this report, but the account should still be monitored continuously. Exposure status can change quickly as new breach and infostealer datasets are published.`,
        margin,
        pageWidth - margin * 2,
    );

    sectionTitle("Target Company Profile");
    const profileRows: Array<[string, string | number | undefined]> = [
        ["Website", data.leadMetadata?.website || data.domain],
        ["Industry", data.leadMetadata?.industry],
        ["Location", data.leadMetadata?.location],
        ["Employee Count", data.leadMetadata?.employeeCount],
        ["Revenue Range", data.leadMetadata?.revenueRange],
        ["Lead Source", data.leadMetadata?.source],
        ["Last Scan", formatDate(data.leadMetadata?.lastScanDate)],
    ];
    doc.setFontSize(9);
    profileRows.forEach(([label, value], index) => {
        const rowY = y + index * 7;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text(label, margin, rowY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(safeText(value), margin + 42, rowY);
    });
    y += profileRows.length * 7 + 4;

    sectionTitle("Business Impact");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setText(primary);
    doc.text("Why this matters", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    paragraph(
        "Attackers frequently use leaked credentials to bypass perimeter controls, target executives and sales teams, and launch convincing follow-up attacks. A small number of valid records can be enough to trigger email compromise, customer impersonation, or broader network intrusion.",
        margin,
        pageWidth - margin * 2,
    );

    sectionTitle(data.credentials.length > 0 ? "5 Sample Leaked Records" : "Exposure Summary");

    if (data.credentials.length > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y - 5, pageWidth - margin * 2, 9, "FD");
        doc.setTextColor(51, 65, 85);
        doc.text("Email / Username", margin + 3, y);
        doc.text("Source", margin + 68, y);
        doc.text("Date", margin + 112, y);
        doc.text("Severity", margin + 148, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        for (const credential of sampleRecords(data.credentials)) {
            addPageIfNeeded(9);
            if (!credential) {
                doc.setTextColor(100, 116, 139);
                doc.text("Additional sample not available", margin + 3, y);
                doc.text("—", margin + 68, y);
                doc.text("—", margin + 112, y);
                doc.text("—", margin + 148, y);
                y += 7;
                continue;
            }
            const username = maskValue(credential.username);
            doc.setTextColor(15, 23, 42);
            doc.text((username || "Unknown").substring(0, 35), margin + 3, y);
            doc.text((credential.source || credential.stealer || "Unknown").substring(0, 24), margin + 68, y);
            doc.text(formatDate(credential.timestamp), margin + 112, y);
            doc.setFont("helvetica", "bold");
            doc.text(severityLabel(credential.severity), margin + 148, y);
            doc.setFont("helvetica", "normal");
            y += 7;
        }
        if (data.credentials.length > 5) {
            y += 2;
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(`Showing 5 sample records from ${data.credentials.length} findings. Contact ${mspName} for the full reviewed dataset.`, margin, y);
            y += 6;
        }
    } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        paragraph(
            exposureCount > 0
                ? `${exposureCount} exposure indicator${exposureCount === 1 ? "" : "s"} were recorded for this lead, but credential-level evidence is not currently attached to this lead record. Use this report as a prospecting summary and run a fresh Live Search before customer presentation if detailed evidence is required.`
                : "No credential-level evidence is attached to this report. Use continuous monitoring and periodic Live Search checks to validate the current exposure state before outreach.",
            margin,
            pageWidth - margin * 2,
        );
    }

    sectionTitle("Recommended Next Steps");
    const recommendations =
        data.recommendations && data.recommendations.length > 0
            ? data.recommendations
            : [
                  "Validate whether exposed credentials are still active and force password resets where appropriate.",
                  "Enable or review MFA coverage for affected users and privileged accounts.",
                  "Monitor the domain for new infostealer and breach data over the next 30 days.",
                  "Review email security, endpoint visibility, and user-awareness controls with your MSP security team.",
              ];
    doc.setFontSize(10);
    recommendations.forEach((recommendation, index) => {
        addPageIfNeeded(10);
        doc.setFont("helvetica", "bold");
        setText(primary);
        doc.text(`${index + 1}.`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(recommendation, pageWidth - margin * 2 - 9);
        doc.text(lines, margin + 9, y);
        y += lines.length * 5 + 4;
    });

    addPageIfNeeded(28);
    y += 4;
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 23, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`Next step: review these findings with ${mspName}`, margin + 6, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Use this report to prioritize remediation, validate risk, and start a security improvement conversation.", margin + 6, y + 16);

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, logoImageType, margin, pageHeight - 14, 10, 6, undefined, "FAST");
                doc.text(`Generated by CyberHook for ${mspName}`, margin + 13, pageHeight - 10);
            } catch {
                doc.text(`Generated by CyberHook for ${mspName}`, margin, pageHeight - 10);
            }
        } else {
            doc.text(`Generated by CyberHook for ${mspName}`, margin, pageHeight - 10);
        }
        doc.text("Confidential - For authorized use only", pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.text(`${page}/${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    const dateStr = data.generatedAt.toISOString().slice(0, 10);
    doc.save(`CyberHook-Report-${sanitizeFilePart(data.domain)}-${dateStr}.pdf`);
}
